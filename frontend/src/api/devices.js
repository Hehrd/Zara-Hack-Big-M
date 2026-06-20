import { apiClient } from './client'

export async function getDevices() {
  const { data } = await apiClient.get('/devices')
  return data
}
