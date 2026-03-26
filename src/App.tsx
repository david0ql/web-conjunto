import { CallsProvider } from '@/features/calls/calls-provider'
import { AppRouter } from '@/app/router'

export default function App() {
  return (
    <CallsProvider>
      <AppRouter />
    </CallsProvider>
  )
}
