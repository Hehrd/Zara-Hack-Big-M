import { apiClient } from './client'

export async function createAnalysis(input) {
  const { data } = await apiClient.post('/analyses', input)
  return data
}

export async function getAreaInsight({ analysisId, lat, lng }) {
  const { data } = await apiClient.get(`/analyses/${analysisId}/area`, { params: { lat, lng } })
  return data
}
