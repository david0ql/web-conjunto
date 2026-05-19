import { useSyncExternalStore } from 'react'

let activeRequests = 0
const listeners = new Set<() => void>()
let requestSequence = 0
const fallbackTimers = new Map<number, ReturnType<typeof setTimeout>>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return activeRequests > 0
}

function getServerSnapshot() {
  return false
}

function clearFallbackTimer(requestId: number) {
  const timer = fallbackTimers.get(requestId)
  if (!timer) return
  clearTimeout(timer)
  fallbackTimers.delete(requestId)
}

export function beginGlobalRequest(): number {
  requestSequence += 1
  const requestId = requestSequence
  activeRequests += 1
  const timer = setTimeout(() => {
    endGlobalRequest(requestId)
  }, 20000)
  fallbackTimers.set(requestId, timer)
  emit()
  return requestId
}

export function endGlobalRequest(requestId?: number) {
  if (typeof requestId === 'number') {
    clearFallbackTimer(requestId)
  }
  activeRequests = Math.max(0, activeRequests - 1)
  emit()
}

export function useGlobalNetworkLoading() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
