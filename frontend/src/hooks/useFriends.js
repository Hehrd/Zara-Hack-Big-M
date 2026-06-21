import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFriend, getFriendAnalyses, getFriends, removeFriend } from '@/api/friends'

export function useFriends() {
  return useQuery({ queryKey: ['friends'], queryFn: getFriends })
}

export function useFriendAnalyses(friendId) {
  return useQuery({
    queryKey: ['friends', friendId, 'analyses'],
    queryFn: () => getFriendAnalyses(friendId),
    enabled: friendId != null,
  })
}

export function useAddFriend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token) => addFriend(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export function useRemoveFriend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendId) => removeFriend(friendId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })
}
