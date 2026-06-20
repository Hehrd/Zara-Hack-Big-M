import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { useHealth } from '@/hooks/useHealth'

export function HealthPage() {
  const { data, error, isPending, isFetching, refetch } = useHealth()

  return (
    <>
      <PageHeader eyebrow="Integration test" title="API health check" description="This request travels through React Query and Axios, then MSW answers it in development." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>GET /health</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? 'animate-spin' : ''} /> Retry
            </Button>
          </CardTitle>
          <CardDescription>Backend connectivity status</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && <p className="text-muted-foreground">Checking API health…</p>}
          {error && <p role="alert" className="text-destructive">Request failed: {error.message}</p>}
          {data && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span>API status: <strong>{data.status}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
