import { createFileRoute } from '@tanstack/react-router'
import { FriendAnalysisPage } from '@/pages/FriendAnalysisPage'

export const Route = createFileRoute('/friends/$friendId/analyses/$analysisId')({
  component: FriendAnalysisPage,
})
