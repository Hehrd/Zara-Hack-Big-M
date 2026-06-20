import { useQuery } from '@tanstack/react-query'
import { getAnalyses, getAnalysis } from '@/api/analyses'

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
