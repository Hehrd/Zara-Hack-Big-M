import { apiClient } from './client'

export async function addFriend(token) {
  const { data } = await apiClient.post(`/api/friends/add/${token}`)
  return data
}

export async function getFriends() {
  const { data } = await apiClient.get('/api/friends')
  return data
}

export async function getFriendAnalyses(friendId) {
  const { data } = await apiClient.get(`/api/friends/${friendId}/analyses`)
  return data
}

export async function getFriendAnalysis(friendId, analysisId) {
  const { data } = await apiClient.get(`/api/friends/${friendId}/analyses/${analysisId}`)
  return data
}

export async function removeFriend(friendId) {
  await apiClient.delete(`/api/friends/${friendId}`)
}
