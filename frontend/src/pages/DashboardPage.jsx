import { Bell, Radio, Server } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { useAlerts } from '@/hooks/useAlerts'
import { useDevices } from '@/hooks/useDevices'
import { useHealth } from '@/hooks/useHealth'

export function DashboardPage() {
  const health = useHealth()
  const devices = useDevices()
  const alerts = useAlerts()
  const stats = [
    { label: 'API status', value: health.data?.status ?? 'checking', icon: Server },
    { label: 'Devices', value: devices.data?.length ?? '—', icon: Radio },
    { label: 'Open alerts', value: alerts.data?.length ?? '—', icon: Bell },
  ]

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" description="A compact snapshot powered entirely by the mock API." />
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-sm">{label}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent className="text-3xl font-bold capitalize">{value}</CardContent></Card>
        ))}
      </div>
    </>
  )
}
