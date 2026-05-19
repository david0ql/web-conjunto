import { CallsProvider } from '@/features/calls/calls-provider'
import { AppRouter } from '@/app/router'
import { GlobalLoadingOverlay } from '@/components/GlobalLoadingOverlay'

export default function App() {
  return (
    <CallsProvider>
      <AppRouter />
      <GlobalLoadingOverlay />
    </CallsProvider>
  )
}
