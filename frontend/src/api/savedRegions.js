import { apiClient } from './client'

export async function getSavedRegions() {
  const { data } = await apiClient.get('/api/saved-regions')
  return data
}

export async function saveRegion({ analysisId, lsoaCode, notes, tags }) {
  const { data } = await apiClient.post('/api/saved-regions', {
    analysis_id: analysisId,
    lsoa_code: lsoaCode,
    notes,
    tags,
  })
  return data
}

export async function updateSavedRegion(id, { notes, tags }) {
  const { data } = await apiClient.put(`/api/saved-regions/${id}`, { notes, tags })
  return data
}

export async function deleteSavedRegion(id) {
  await apiClient.delete(`/api/saved-regions/${id}`)
}
