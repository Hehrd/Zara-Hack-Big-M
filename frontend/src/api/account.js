import { apiClient } from './client'

export async function getAccount() {
  const { data } = await apiClient.get('/api/account')
  return data
}

export async function updateCredentials(payload) {
  const { data } = await apiClient.put('/api/account/credentials', payload)
  return data
}
