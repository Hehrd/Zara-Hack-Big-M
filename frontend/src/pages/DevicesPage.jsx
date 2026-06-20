import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link, Outlet, useNavigate, useSearch } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { useDevices } from '@/hooks/useDevices'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

const statuses = ['all', 'online', 'offline']

export function DevicesPage() {
  const { status } = useSearch({ from: '/devices' })
  const navigate = useNavigate({ from: '/devices' })
  const { data, error, isPending } = useDevices()
  const { selectedDeviceId, selectDevice } = useAppStore()
  const visibleDevices = status === 'all' ? data : data?.filter((device) => device.status === status)

  return (
    <>
      <PageHeader eyebrow="Fleet" title="Devices" description="Select a device to exercise the minimal Zustand client-state store." />
      <div className="mb-6 flex gap-2" aria-label="Filter devices by status">
        {statuses.map((value) => (
          <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} onClick={() => navigate({ search: { status: value } })} className="capitalize">
            {value}
          </Button>
        ))}
      </div>
      {isPending && <QueryState message="Loading devices…" />}
      {error && <QueryState message={`Could not load devices: ${error.message}`} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleDevices?.map((device) => (
          <Link key={device.id} to="/devices/$id" params={{ id: device.id }} onClick={() => selectDevice(device.id)} className="text-left">
            <Card className={cn('h-full hover:border-primary/50', selectedDeviceId === device.id && 'border-primary ring-2 ring-primary/15')}>
              <CardHeader><CardTitle className="flex items-center justify-between"><span>{device.name}</span><span className={cn('size-2.5 rounded-full', device.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300')} /></CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground"><p>ID: {device.id}</p><p>Temperature: {device.temperature}°C</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Outlet />
    </>
  )
}
