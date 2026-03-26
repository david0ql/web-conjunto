import { use } from 'react'
import { CallsContext } from '@/features/calls/calls-context'

export function useCalls() {
  const context = use(CallsContext)

  if (!context) {
    throw new Error('useCalls must be used within CallsProvider')
  }

  return context
}
