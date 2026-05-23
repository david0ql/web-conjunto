import { useCallback, useEffect, useRef, useState } from 'react'

const ZEBRA_VENDOR_ID = 0x05e0
const ZEBRA_PRODUCT_ID = 0x1300

export const SCANNER_EVENT = 'zebra:scan'

export type WebHidStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'error'

type HidDevice = EventTarget & {
  opened: boolean
  vendorId: number
  productId: number
  open: () => Promise<void>
  close: () => Promise<void>
}

type HidInputReportEvent = Event & {
  data: DataView
}

type HidApi = {
  requestDevice: (options: { filters: Array<{ vendorId: number; productId: number }> }) => Promise<HidDevice[]>
  getDevices: () => Promise<HidDevice[]>
}

declare global {
  interface Navigator {
    hid?: HidApi
  }
}

function parseSnapi(data: Uint8Array): string {
  // SNAPI: byte 0 = msg type (0x04 = decode data), byte 1 = total len, byte 2 = symbology, byte 3+ = ASCII data
  // Fallback: scan all printable bytes ignoring CR/LF/NUL
  const start = data[0] === 0x04 ? 3 : 0
  const bytes: number[] = []
  for (let i = start; i < data.length; i++) {
    const b = data[i]
    if (b === 0x00 || b === 0x0d || b === 0x0a) continue
    if (b >= 0x20 && b <= 0x7e) bytes.push(b)
  }
  return String.fromCharCode(...bytes).trim()
}

export function useWebHidScanner() {
  const [status, setStatus] = useState<WebHidStatus>(() =>
    typeof navigator !== 'undefined' && 'hid' in navigator ? 'disconnected' : 'unsupported',
  )
  const deviceRef = useRef<HidDevice | null>(null)

  const handleInputReport = useCallback((event: HidInputReportEvent) => {
    const data = new Uint8Array(event.data.buffer)
    const barcode = parseSnapi(data)
    if (barcode.length >= 4) {
      window.dispatchEvent(new CustomEvent(SCANNER_EVENT, { detail: { value: barcode } }))
    }
  }, [])

  const openDevice = useCallback(async (device: HidDevice) => {
    if (!device.opened) await device.open()
    device.addEventListener('inputreport', handleInputReport as EventListener)
    deviceRef.current = device
    setStatus('connected')
  }, [handleInputReport])

  const connect = useCallback(async () => {
    if (!navigator.hid) return
    try {
      setStatus('connecting')
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: ZEBRA_VENDOR_ID, productId: ZEBRA_PRODUCT_ID }],
      })
      const device = devices[0]
      if (!device) { setStatus('disconnected'); return }
      await openDevice(device)
    } catch {
      setStatus('error')
    }
  }, [openDevice])

  // Auto-reconnect to already-permitted device
  useEffect(() => {
    if (!navigator.hid) return

    async function tryAutoConnect() {
      if (!navigator.hid) return
      const devices = await navigator.hid.getDevices()
      const device = devices.find(
        (d) => d.vendorId === ZEBRA_VENDOR_ID && d.productId === ZEBRA_PRODUCT_ID,
      )
      if (device) await openDevice(device).catch(() => setStatus('disconnected'))
    }

    void tryAutoConnect()

    return () => {
      const d = deviceRef.current
      if (d) {
        d.removeEventListener('inputreport', handleInputReport as EventListener)
        void d.close().catch(() => {})
        deviceRef.current = null
      }
    }
  }, [openDevice, handleInputReport])

  return { status, connect }
}

/**
 * Extracts the most likely document/ID number from raw barcode data.
 * Colombian cedula PDF417 barcodes encode structured binary data that starts
 * with non-numeric bytes before the actual CC number. This pulls the longest
 * contiguous alphanumeric sequence, preferring all-digit runs (cedula numbers).
 */
export function extractDocumentFromBarcode(raw: string): string {
  const trimmed = raw.trim()
  // Already clean: only alphanumeric chars (typical 1D Code128 scan)
  if (/^[A-Za-z0-9]{4,}$/.test(trimmed)) return trimmed

  // Prefer longest all-digit sequence (Colombian CC = 6-10 digits)
  const digitRuns = [...trimmed.matchAll(/\d{5,15}/g)].map((m) => m[0])
  if (digitRuns.length > 0) return digitRuns.reduce((a, b) => (a.length >= b.length ? a : b))

  // Fallback: longest alphanumeric run (passport-style)
  const alphaRuns = [...trimmed.matchAll(/[A-Za-z0-9]{4,}/g)].map((m) => m[0])
  if (alphaRuns.length > 0) return alphaRuns.reduce((a, b) => (a.length >= b.length ? a : b))

  return trimmed
}

/** Subscribe to scan events from the Zebra scanner (or keyboard wedge fallback) */
export function useScanInput(onScan: (value: string) => void, enabled = true) {
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return
    function handler(e: Event) {
      const value = (e as CustomEvent<{ value: string }>).detail?.value
      if (value) onScanRef.current(value)
    }
    window.addEventListener(SCANNER_EVENT, handler)
    return () => window.removeEventListener(SCANNER_EVENT, handler)
  }, [enabled])
}
