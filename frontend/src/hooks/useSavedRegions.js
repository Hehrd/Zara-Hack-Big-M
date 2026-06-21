import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteSavedRegion,
  getSavedRegions,
  saveRegion,
  updateSavedRegion,
  updateSavedRegionVisibility,
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
    mutationFn: ({ id, notes }) => updateSavedRegion(id, { notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-regions'] }),
  })
}

export function useUpdateSavedRegionVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, publicShared }) => updateSavedRegionVisibility(id, publicShared),
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
