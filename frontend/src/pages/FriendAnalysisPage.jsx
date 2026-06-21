import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Flag, Trophy, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFriendAnalysis } from '@/api/friends'

function formatLayerName(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function FriendAnalysisPage() {
  const { friendId, analysisId } = useParams({ strict: false })
  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', friendId, 'analyses', analysisId],
    queryFn: () => getFriendAnalysis(friendId, analysisId),
  })

  const result = data?.result

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-12">
      <Button variant="ghost" size="sm" className="mb-6" nativeButton={false} render={<Link to="/friends" search={{ friend: Number(friendId) }} />}>
        <ArrowLeft className="size-4" /> Back to friends
      </Button>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="text-sm text-destructive">Could not load this analysis.</p>}

      {data && (
        <>
          <header className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Shared analysis</p>
            <h1 className="text-3xl font-semibold tracking-tight">{data.business_description || 'Untitled analysis'}</h1>
            <p className="mt-2 text-muted-foreground">{data.city} · top {data.requested_result_count} areas</p>
          </header>

          {result?.business_needs && (
            <section className="mb-6 rounded-3xl border bg-white p-6">
              <p className="text-xs text-muted-foreground">Detected business type</p>
              <p className="mt-1 text-sm font-semibold">{result.business_needs.business_type}</p>
              {result.business_needs.needs?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.business_needs.needs.map((need) => (
                    <span key={need} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-800">{need}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-amber-500" /> Top {result?.ranked_locations?.length ?? 0} areas</p>
            {result?.ranked_locations?.length ? result.ranked_locations.map((loc, index) => {
              const explanation = result.explanations?.find((e) => e.lsoa_code === loc.lsoa_code)
              const weights = Object.entries(loc.weighted_layer_values || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              return (
                <div key={loc.lsoa_code} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">#{index + 1} · {loc.lsoa_name}</p>
                      <p className="text-[11px] text-muted-foreground">{loc.lsoa_code}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white"><Flag className="size-3" /> {Number(loc.final_score).toFixed(3)}</span>
                  </div>
                  {weights.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {weights.slice(0, 4).map(([id, value]) => (
                        <div key={id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{formatLayerName(id)}</span>
                          <span className={value < 0 ? 'flex items-center gap-1 font-medium text-rose-600' : 'flex items-center gap-1 font-medium text-emerald-700'}>
                            {value < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                            {Number(value).toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {explanation && (
                    <p className="mt-3 border-t pt-3 text-[11px] leading-5 text-slate-700">{explanation.explanation}</p>
                  )}
                </div>
              )
            }) : (
              <p className="text-sm text-muted-foreground">This analysis has no ranked results to show.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
