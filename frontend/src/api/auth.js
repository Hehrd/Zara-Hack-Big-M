import { apiClient } from './client'

export async function signUp(credentials) {
  const { data } = await apiClient.post('/api/auth/signup', credentials)
  return data
}

export async function logIn(credentials) {
  const { data } = await apiClient.post('/api/auth/login', credentials)
  return data
}

export async function refreshTokens(refreshToken) {
  const { data } = await apiClient.post('/api/auth/refresh', { refreshToken }, { skipAuthRefresh: true })
  return data
}

export async function logOut(refreshToken) {
  await apiClient.post('/api/auth/logout', { refreshToken }, { skipAuthRefresh: true })
}
