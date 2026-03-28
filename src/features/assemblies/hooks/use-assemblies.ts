import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useAssemblies() {
  return useQuery({
    queryKey: ['assemblies'],
    queryFn: () => api.getAssemblies(),
  })
}

export function useAssembly(id: string) {
  return useQuery({
    queryKey: ['assemblies', id],
    queryFn: () => api.getAssembly(id),
    enabled: !!id,
  })
}

export function useCreateAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createAssembly(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assemblies'] }),
  })
}

export function useStartAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.startAssembly(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['assemblies'] })
      qc.invalidateQueries({ queryKey: ['assemblies', id] })
    },
  })
}

export function useFinishAssembly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.finishAssembly(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['assemblies'] })
      qc.invalidateQueries({ queryKey: ['assemblies', id] })
    },
  })
}

export function useOpenQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, questionId }: { assemblyId: string; questionId: string }) =>
      api.openQuestion(assemblyId, questionId),
    onSuccess: (_data, { assemblyId }) => {
      qc.invalidateQueries({ queryKey: ['assemblies', assemblyId] })
    },
  })
}

export function useCloseQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assemblyId, questionId }: { assemblyId: string; questionId: string }) =>
      api.closeQuestion(assemblyId, questionId),
    onSuccess: (_data, { assemblyId }) => {
      qc.invalidateQueries({ queryKey: ['assemblies', assemblyId] })
    },
  })
}
