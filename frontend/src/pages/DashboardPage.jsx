import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Bookmark, Clock3, Compass, Flag, Map, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAnalyses } from '@/hooks/useAnalyses'
import { useDeleteSavedRegion, useSavedRegions, useUpdateSavedRegion } from '@/hooks/useSavedRegions'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DashboardPage() {
  const analyses = useAnalyses()
  const savedRegions = useSavedRegions()

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Your workspace</p><h1 className="text-4xl font-semibold tracking-[-0.04em]">Good morning.</h1><p className="mt-2 text-muted-foreground">Your next location starts with a question.</p></div>
        <Button size="lg" nativeButton={false} render={<Link to="/maps" />}>New analysis <ArrowRight /></Button>
      </div>
      <section className="relative overflow-hidden rounded-3xl bg-[#193128] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
        <div className="contour-field absolute -right-28 -top-40 size-[520px] opacity-30" />
        <div className="relative max-w-xl"><span className="mb-5 grid size-11 place-items-center rounded-2xl bg-emerald-400 text-[#12251e]"><Compass /></span><h2 className="text-3xl font-semibold tracking-[-0.035em]">Explore your first opportunity map</h2><p className="mt-3 leading-7 text-emerald-50/70">Choose a business type and target area. Locus will turn backend-scored location signals into one clear surface.</p><Button className="mt-7 bg-white text-[#193128] hover:bg-emerald-50" nativeButton={false} render={<Link to="/maps" />}>Start exploring <ArrowRight /></Button></div>
      </section>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <RecentAnalysesPanel query={analyses} />
        <SavedLocationsPanel query={savedRegions} />
      </div>
      <div className="mt-8 flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm text-muted-foreground"><Map className="size-5 text-emerald-700" /><span>No fabricated results—your workspace fills up only after you run an analysis.</span></div>
    </div>
  )
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="rounded-3xl border bg-white p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-5" /></span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function EmptyState({ text }) {
  return (
    <>
      <div className="h-px bg-border" />
      <p className="mt-4 text-xs font-medium text-muted-foreground">{text}</p>
    </>
  )
}

function RecentAnalysesPanel({ query }) {
  const { data, isLoading, isError } = query
  return (
    <Panel icon={Clock3} title="Recent analyses">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="text-sm text-destructive">Could not load analyses.</p>}
      {!isLoading && !isError && (data?.length ? (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id}>
              <Link
                to="/maps"
                search={{ analysis: a.id }}
                className="block rounded-2xl border bg-white p-4 transition hover:border-emerald-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.business_description || 'Untitled analysis'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{a.city} · top {a.requested_result_count} areas</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(a.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState text="Completed analyses will appear here so you can continue comparing areas." />
      ))}
    </Panel>
  )
}

function SavedLocationsPanel({ query }) {
  const { data, isLoading, isError } = query
  return (
    <Panel icon={Bookmark} title="Saved locations">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="text-sm text-destructive">Could not load saved locations.</p>}
      {!isLoading && !isError && (data?.length ? (
        <ul className="space-y-3">
          {data.map((region) => (
            <SavedRegionCard key={region.id} region={region} />
          ))}
        </ul>
      ) : (
        <EmptyState text="Save promising areas from the map and revisit them before making a decision." />
      ))}
    </Panel>
  )
}

function SavedRegionCard({ region }) {
  const update = useUpdateSavedRegion()
  const remove = useDeleteSavedRegion()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(region.notes ?? '')
  const [tagsText, setTagsText] = useState((region.tags ?? []).join(', '))

  function startEditing() {
    setNotes(region.notes ?? '')
    setTagsText((region.tags ?? []).join(', '))
    setEditing(true)
  }

  function saveEdits() {
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean)
    update.mutate({ id: region.id, notes: notes.trim() || null, tags }, { onSuccess: () => setEditing(false) })
  }

  return (
    <li className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{region.lsoa_name || region.lsoa_code}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{region.city} · {region.business_description}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white"><Flag className="size-3" /> {Number(region.final_score).toFixed(3)}</span>
      </div>

      {!editing && (
        <>
          {region.notes && <p className="mt-3 text-[12px] leading-5 text-slate-700">{region.notes}</p>}
          {region.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {region.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-800">{tag}</span>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 border-t pt-3">
            <Link to="/maps" search={{ analysis: region.analysis_id }} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline">
              View analysis <ArrowRight className="size-3" />
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <Button type="button" size="xs" variant="ghost" onClick={startEditing}><Pencil className="size-3.5" /> Edit</Button>
              <Button type="button" size="xs" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => remove.mutate(region.id)}><Trash2 className="size-3.5" /> Delete</Button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (e.g. visited, too expensive)"
            className="w-full rounded-md border border-input bg-white p-2 text-[12px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Tags, comma separated" className="h-9 text-[12px]" />
          <div className="flex items-center gap-2">
            <Button type="button" size="xs" onClick={saveEdits} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}><X className="size-3.5" /> Cancel</Button>
          </div>
        </div>
      )}
    </li>
  )
}
