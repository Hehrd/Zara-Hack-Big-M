import { BellRing } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { useAlerts } from '@/hooks/useAlerts'

export function AlertsPage() {
  const { data, error, isPending } = useAlerts()
  return (
    <>
      <PageHeader eyebrow="Monitoring" title="Alerts" description="Sample Spring Boot-shaped alert resources served by MSW." />
      {isPending && <QueryState message="Loading alerts…" />}
      {error && <QueryState message={`Could not load alerts: ${error.message}`} />}
      <div className="space-y-3">
        {data?.map((alert) => (
          <Card key={alert.id}><CardContent className="flex items-start gap-4 py-5"><BellRing className={alert.severity === 'high' ? 'text-destructive' : 'text-amber-500'} /><div><p className="font-medium">{alert.message}</p><p className="mt-1 text-sm text-muted-foreground">{alert.deviceId} · {alert.severity} priority</p></div></CardContent></Card>
        ))}
      </div>
    </>
  )
}
