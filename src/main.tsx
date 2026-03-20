import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from '@/App'
import { AuthProvider } from '@/hooks/use-auth'
import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster
          richColors
          expand
          position="top-right"
          toastOptions={{
            className: '!border-border !bg-card !text-foreground',
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
