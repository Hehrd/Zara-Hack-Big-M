import { apiClient } from './client'

export async function getAlerts() {
  const { data } = await apiClient.get('/alerts')
  return data
}
