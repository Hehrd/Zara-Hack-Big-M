import { createFileRoute } from '@tanstack/react-router'
import { MapsPage } from '@/pages/MapsPage'

export const Route = createFileRoute('/maps')({
  component: MapsPage,
})
