import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, GitCompareArrows, MapPin, Trophy } from 'lucide-react'
import { AgCharts } from 'ag-charts-react'
import { BarSeriesModule, CategoryAxisModule, LegendModule, ModuleRegistry, NumberAxisModule } from 'ag-charts-community'
import { Button } from '@/components/ui/button'

const EXCLUDED_METRICS = new Set(['competitors', 'relevant_locations'])

ModuleRegistry.registerModules([BarSeriesModule, CategoryAxisModule, LegendModule, NumberAxisModule])

function readComparison() {
  try {
    return JSON.parse(sessionStorage.getItem('locus-region-comparison')) ?? {}
  } catch {
    return {}
  }
}

function formatMetric(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(3) : '—'
}

export function ComparePage() {
  const [comparison] = useState(readComparison)
  const areas = useMemo(() => comparison.areas ?? [], [comparison.areas])
  const categoriesById = useMemo(() => new Map((comparison.categories ?? []).map((category) => [category.category_id, category])), [comparison.categories])
  const metrics = useMemo(() => Array.from(new Set(areas.flatMap((area) => Object.keys(area.weighted_layer_values ?? {})))).filter((metric) => !EXCLUDED_METRICS.has(metric)), [areas])
  const chartOptions = useMemo(() => ({
    data: metrics.map((metric) => ({
      parameter: categoriesById.get(metric)?.display_name ?? formatMetric(metric),
      ...Object.fromEntries(areas.map((area, index) => [`region_${index}`, area.normalized_layer_values?.[metric] ?? 0])),
    })),
    title: { text: 'Region performance by parameter' },
    subtitle: { text: 'Normalized dataset values from 0 to 1' },
    series: areas.map((area, index) => ({
      type: 'bar',
      xKey: 'parameter',
      yKey: `region_${index}`,
      yName: area.lsoa_name,
    })),
    legend: { position: 'bottom' },
    background: { fill: 'transparent' },
    padding: { top: 24, right: 24, bottom: 16, left: 16 },
  }), [areas, categoriesById, metrics])

  if (areas.length < 2) {
    return <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f2] p-5 lg:min-h-screen lg:p-10"><div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm"><GitCompareArrows className="mx-auto size-10 text-emerald-600" /><h1 className="mt-4 text-2xl font-semibold">No comparison selected</h1><p className="mt-2 text-sm text-muted-foreground">Choose at least two regions from Explore using the right-click menu.</p><Button className="mt-6" nativeButton={false} render={<Link to="/maps" />}><ArrowLeft /> Back to Explore</Button></div></main>
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f2] px-4 py-6 lg:min-h-screen lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <Button variant="ghost" nativeButton={false} render={<Link to="/maps" />}><ArrowLeft /> Back to map</Button>
        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700"><GitCompareArrows className="size-4" /> Region comparison</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Compare {areas.length} regions</h1><p className="mt-2 text-sm text-muted-foreground">{comparison.businessType || 'Opportunity analysis'} · side-by-side ranking signals</p></div>
          <div className="rounded-xl border bg-white px-4 py-2 text-xs text-muted-foreground"><BarChart3 className="mr-2 inline size-4 text-emerald-600" />Grouped by ranking parameter</div>
        </div>

        <section className="mt-7 rounded-3xl border bg-white p-3 shadow-sm sm:p-5">
          <div style={{ height: Math.max(420, metrics.length * (80 + areas.length * 8)) }}><AgCharts options={chartOptions} /></div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {areas.map((area, index) => <article key={area.lsoa_code} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{index + 1}</span><span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">{formatValue(area.final_score)}</span></div><h2 className="mt-4 font-semibold">{area.lsoa_name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{area.lsoa_code}</p></article>)}
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4"><h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-amber-500" />Ranking breakdown</h2><p className="mt-1 text-xs text-muted-foreground">Weighted contribution with the normalized dataset value underneath.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead><tr className="bg-slate-50"><th className="sticky left-0 z-10 min-w-48 border-b bg-slate-50 px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Parameter</th>{areas.map((area) => <th key={area.lsoa_code} className="min-w-44 border-b px-4 py-3 text-left text-xs font-semibold">{area.lsoa_name}</th>)}</tr></thead>
              <tbody>
                <tr><th className="sticky left-0 border-b bg-white px-5 py-4 text-left font-semibold">Final score</th>{areas.map((area) => <td key={area.lsoa_code} className="border-b px-4 py-4 text-lg font-semibold tabular-nums">{formatValue(area.final_score)}</td>)}</tr>
                {metrics.map((metric) => <tr key={metric} className="hover:bg-slate-50/70"><th className="sticky left-0 border-b bg-white px-5 py-4 text-left"><span className="font-medium">{categoriesById.get(metric)?.display_name ?? formatMetric(metric)}</span><span className="mt-1 block text-[10px] font-normal uppercase tracking-wide text-muted-foreground">{categoriesById.get(metric)?.polarity ?? 'signal'}</span></th>{areas.map((area) => { const weighted = area.weighted_layer_values?.[metric]; const normalized = area.normalized_layer_values?.[metric]; return <td key={area.lsoa_code} className="border-b px-4 py-4"><span className={`font-semibold tabular-nums ${weighted < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{weighted > 0 ? '+' : ''}{formatValue(weighted)}</span><span className="mt-1 block text-[11px] text-muted-foreground">Normalized: {formatValue(normalized)}</span></td> })}</tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
