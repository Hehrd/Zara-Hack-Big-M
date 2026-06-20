import axios from 'axios'
import { clearAuthSession, getAuthSession, saveAuthSession } from './authSession'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:6969',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = getAuthSession()?.accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshRequest

apiClient.interceptors.response.use(undefined, async (error) => {
  const request = error.config
  const session = getAuthSession()
  if (error.response?.status !== 401 || request?._retried || request?.skipAuthRefresh || !session?.refreshToken) {
    return Promise.reject(error)
  }

  request._retried = true
  refreshRequest ||= axios.post(`${apiClient.defaults.baseURL}/api/auth/refresh`, {
    refreshToken: session.refreshToken,
  }).then(({ data }) => saveAuthSession(data, session.email)).finally(() => { refreshRequest = null })

  try {
    const refreshed = await refreshRequest
    request.headers.Authorization = `Bearer ${refreshed.accessToken}`
    return apiClient(request)
  } catch (refreshError) {
    clearAuthSession()
    window.dispatchEvent(new Event('auth:expired'))
    return Promise.reject(refreshError)
  }
})
