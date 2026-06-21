import { createFileRoute } from '@tanstack/react-router'
import { AddFriendPage } from '@/pages/AddFriendPage'

export const Route = createFileRoute('/api/add-friend/$token')({
  component: AddFriendPage,
})
