import { apiClient } from './client'

export async function getSavedRegions() {
  const { data } = await apiClient.get('/api/saved-regions')
  return data
}

export async function saveRegion({ analysisId, lsoaCode, notes }) {
  const { data } = await apiClient.post('/api/saved-regions', {
    analysis_id: analysisId,
    lsoa_code: lsoaCode,
    notes,
  })
  return data
}

export async function updateSavedRegion(id, { notes }) {
  const { data } = await apiClient.put(`/api/saved-regions/${id}`, { notes })
  return data
}

export async function updateSavedRegionVisibility(id, publicShared) {
  const { data } = await apiClient.put(`/api/saved-regions/${id}/visibility`, { public_shared: publicShared })
  return data
}

export async function deleteSavedRegion(id) {
  await apiClient.delete(`/api/saved-regions/${id}`)
}
