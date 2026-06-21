import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteSavedRegion,
  getSavedRegions,
  saveRegion,
  updateSavedRegion,
} from '@/api/savedRegions'

export function useSavedRegions() {
  return useQuery({ queryKey: ['saved-regions'], queryFn: getSavedRegions })
}

export function useSaveRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveRegion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-regions'] }),
  })
}

export function useUpdateSavedRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes, tags }) => updateSavedRegion(id, { notes, tags }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-regions'] }),
  })
}

export function useDeleteSavedRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSavedRegion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-regions'] }),
  })
}
