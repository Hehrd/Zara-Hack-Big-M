import { apiClient } from './client'

export async function getAnalyses() {
  const { data } = await apiClient.get('/api/analyze')
  return data
}

export async function getAnalysis(id) {
  const { data } = await apiClient.get(`/api/analyze/${id}`)
  return data
}
