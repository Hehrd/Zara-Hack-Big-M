import { apiClient } from './client'

export async function getAnalyses() {
  const { data } = await apiClient.get('/api/analyze')
  return data
}

export async function getAnalysis(id) {
  const { data } = await apiClient.get(`/api/analyze/${id}`)
  return data
}

export async function rescoreAnalysis(id, weights) {
  const { data } = await apiClient.post(`/api/analyze/${id}/rescore`, { weights })
  return data
}
