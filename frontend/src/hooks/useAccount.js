import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccount, updateCredentials } from '@/api/account'

export function useAccount() {
  return useQuery({ queryKey: ['account'], queryFn: getAccount })
}

export function useUpdateCredentials() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => updateCredentials(payload),
    onSuccess: (data) => queryClient.setQueryData(['account'], data),
  })
}
