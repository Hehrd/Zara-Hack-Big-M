import { createFileRoute } from '@tanstack/react-router'
import { MapsPage } from '@/pages/MapsPage'

export const Route = createFileRoute('/maps')({
  component: MapsPage,
  validateSearch: (search) => ({
    analysis: search.analysis != null ? Number(search.analysis) : undefined,
  }),
})
