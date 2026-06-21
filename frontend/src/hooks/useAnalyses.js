import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAnalyses, getAnalysis, rescoreAnalysis } from '@/api/analyses'

export function useAnalyses() {
  return useQuery({ queryKey: ['analyses'], queryFn: getAnalyses })
}

export function useAnalysis(id) {
  return useQuery({
    queryKey: ['analyses', id],
    queryFn: () => getAnalysis(id),
    enabled: id != null,
  })
}

export function useRescoreAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, weights }) => rescoreAnalysis(id, weights),
    onSuccess: (data) => {
      queryClient.setQueryData(['analyses', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
    },
  })
}
