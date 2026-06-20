import { createFileRoute } from '@tanstack/react-router'
import { RecommendationsPage } from '@/pages/RecommendationsPage'

export const Route = createFileRoute('/recommendations')({
  component: RecommendationsPage,
})
