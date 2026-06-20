import { Link, useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { useDevices } from '@/hooks/useDevices'

export function DeviceDetailPage() {
  const { id } = useParams({ from: '/devices/$id' })
  const { data, error, isPending } = useDevices()
  const device = data?.find((item) => item.id === id)

  return (
    <>
      <PageHeader eyebrow="Fleet device" title={device?.name ?? id} description="Dynamic file route: /devices/$id" />
      {isPending && <QueryState message="Loading device…" />}
      {error && <QueryState message={`Could not load device: ${error.message}`} />}
      {!isPending && !error && !device && <QueryState message={`Device ${id} was not found.`} />}
      {device && (
        <Card className="max-w-xl">
          <CardHeader><CardTitle>{device.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>ID: {device.id}</p>
            <p>Status: <span className="capitalize">{device.status}</span></p>
            <p>Temperature: {device.temperature}°C</p>
          </CardContent>
        </Card>
      )}
      <Button className="mt-6" variant="outline" nativeButton={false} render={<Link to="/devices" search={{ status: 'all' }} />}>Back to devices</Button>
    </>
  )
}
