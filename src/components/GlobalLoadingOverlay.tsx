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
        className="w-full max-w-[320px] rounded-[1.5rem] border border-[#e5e5e5] px-7 py-8 shadow-[0_24px_72px_rgba(16,17,20,0.18)]"
        style={{
          background: '#ffffff',
        }}
      >
        <div className="relative mx-auto flex size-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#e5e5e5]" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-r-[#111217] border-t-[#111217]" />
          <div
            className="absolute inset-[7px] flex items-center justify-center rounded-full border border-[#eeeeee]"
            style={{
              background: '#ffffff',
              boxShadow: '0 10px 28px rgba(16,17,20,0.12)',
            }}
          >
            <img
              src="/logo-transparent.png"
              alt="Conjunto"
              className="size-16 object-contain"
              draggable={false}
            />
          </div>
        </div>

        <p
          className="mt-5 text-center text-base text-[#2c2f30]"
          style={{ fontFamily: 'AlpinaSans, sans-serif', fontWeight: 700 }}
        >
          Un momento&hellip;
        </p>
        <p
          className="mt-1 text-center text-xs text-[#595c5d]"
          style={{ fontFamily: 'AlpinaSans, sans-serif', fontWeight: 400 }}
        >
          Estamos cargando la informacion
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className="size-2 animate-pulse rounded-full bg-[#111217]" />
          <span
            className="size-2 animate-pulse rounded-full bg-[#111217]"
            style={{ animationDelay: '0.14s' }}
          />
          <span
            className="size-2 animate-pulse rounded-full bg-[#111217]"
            style={{ animationDelay: '0.28s' }}
          />
        </div>
      </div>
    </div>
  )
}
