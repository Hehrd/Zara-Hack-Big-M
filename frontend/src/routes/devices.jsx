import { createFileRoute } from '@tanstack/react-router'
import { DevicesPage } from '@/pages/DevicesPage'

const validStatuses = new Set(['all', 'online', 'offline'])

export const Route = createFileRoute('/devices')({
  validateSearch: (search) => ({
    status: validStatuses.has(search.status) ? search.status : 'all',
  }),
  component: DevicesPage,
})
