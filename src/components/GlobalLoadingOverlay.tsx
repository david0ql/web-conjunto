import { useEffect } from 'react'
import { useGlobalNetworkLoading } from '@/lib/network-loading'

export function GlobalLoadingOverlay() {
  const isLoading = useGlobalNetworkLoading()

  useEffect(() => {
    if (!isLoading) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{
        background: 'rgba(12,15,16,0.46)',
        backdropFilter: 'blur(6px)',
      }}
      role="status"
      aria-live="assertive"
      aria-label="Cargando contenido"
    >
      <div
        className="w-full max-w-[320px] rounded-[2rem] border border-[#e6e8ea] px-7 py-8 shadow-[0_24px_72px_rgba(0,0,0,0.22)]"
        style={{
          background: 'linear-gradient(168deg, #ffffff 0%, #f7f9ff 100%)',
        }}
      >
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#dadddf]" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-r-[#0052d0] border-t-[#0052d0]" />
          <div
            className="absolute inset-[6px] flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, #0052d0 0%, #0047b7 100%)',
              boxShadow: '0 2px 12px rgba(0,82,209,0.3)',
            }}
          >
            <img
              src="/logo-transparent.png"
              alt="Conjunto"
              className="h-14 w-14 object-contain"
              draggable={false}
            />
          </div>
        </div>

        <p
          className="mt-5 text-center text-base text-[#2c2f30]"
          style={{ fontFamily: 'AlpinaSans, sans-serif', fontWeight: 700 }}
        >
          Un momento...
        </p>
        <p
          className="mt-1 text-center text-xs text-[#595c5d]"
          style={{ fontFamily: 'AlpinaSans, sans-serif', fontWeight: 400 }}
        >
          Estamos cargando la informacion
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#0052d0]" />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[#0052d0]"
            style={{ animationDelay: '0.14s' }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[#0052d0]"
            style={{ animationDelay: '0.28s' }}
          />
        </div>
      </div>
    </div>
  )
}
