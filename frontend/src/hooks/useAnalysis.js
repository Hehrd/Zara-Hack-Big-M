import { useMutation } from '@tanstack/react-query'
import { createAnalysis, getAreaInsight } from '@/api/analysis'

export function useCreateAnalysis() {
  return useMutation({ mutationFn: createAnalysis })
}

export function useAreaInsight() {
  return useMutation({ mutationFn: getAreaInsight })
}
