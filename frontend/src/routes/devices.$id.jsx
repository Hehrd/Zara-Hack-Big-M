import { createFileRoute } from '@tanstack/react-router'
import { DeviceDetailPage } from '@/pages/DeviceDetailPage'

export const Route = createFileRoute('/devices/$id')({
  component: DeviceDetailPage,
})
