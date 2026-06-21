import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowUpRight, BarChart3, Bookmark, Clock3, Compass, Flag, MapPinned, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisibilityToggle } from '@/components/VisibilityToggle'
import { useAnalyses, useUpdateAnalysisVisibility } from '@/hooks/useAnalyses'
import { useDeleteSavedRegion, useSavedRegions, useUpdateSavedRegion, useUpdateSavedRegionVisibility } from '@/hooks/useSavedRegions'

const EASE = [0.22, 1, 0.36, 1]

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function updateErrorMessage(error, fallback = 'Could not update.') {
  return error?.response?.status === 401
    ? 'Session expired — please log in again.'
    : fallback
}

export function DashboardPage() {
  const analyses = useAnalyses()
  const savedRegions = useSavedRegions()
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative isolate min-h-full overflow-x-clip bg-[#f6f7f3] text-[#17251f]">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(to_right,rgba(23,63,49,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,63,49,.045)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <motion.div
        className="pointer-events-none absolute -right-32 -top-24 -z-10 size-[460px] rounded-full bg-emerald-300/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -28, 0], y: [0, 22, 0], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-12"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end" variants={reveal}>
          <div>
            <p className="mb-2.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50 motion-reduce:animate-none" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-600" /></span>
              Your workspace
            </p>
            <h1 className="text-[clamp(2.5rem,5vw,3.5rem)] font-medium leading-[0.95] tracking-[-0.05em] text-[#13231c]">
              Welcome <span className="font-serif italic tracking-[-0.03em] text-emerald-700">back</span>.
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-7 text-[#5b6a62]">Your next location starts with a single question.</p>
          </div>
          <NewAnalysisButton />
        </motion.div>

        <motion.div variants={reveal}>
          <StatStrip analyses={analyses} savedRegions={savedRegions} />
        </motion.div>

        <motion.div variants={reveal}>
          <HeroCta reduceMotion={reduceMotion} />
        </motion.div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <motion.div variants={reveal}><RecentAnalysesPanel query={analyses} /></motion.div>
          <motion.div variants={reveal}><SavedLocationsPanel query={savedRegions} analyses={analyses.data} /></motion.div>
        </div>
      </motion.div>
    </div>
  )
}

function NewAnalysisButton() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className="inline-flex"
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: reduceMotion ? 1 : 0.985 }}
      variants={{
        rest: { y: 0, boxShadow: '0 14px 30px -16px rgba(23,63,49,.75)' },
        hover: { y: reduceMotion ? 0 : -2, boxShadow: '0 20px 42px -18px rgba(23,63,49,.78)', transition: { type: 'spring', stiffness: 480, damping: 30 } },
      }}
    >
      <Button size="lg" className="h-12 rounded-xl bg-[#173f31] px-6 text-white hover:bg-[#215541]" nativeButton={false} render={<Link to="/maps" />}>
        <span>New analysis</span>
        <motion.span className="-mr-1 inline-flex" variants={{ rest: { x: 0 }, hover: { x: reduceMotion ? 0 : 3 } }} transition={{ type: 'spring', stiffness: 520, damping: 28 }}>
          <ArrowRight className="size-4" />
        </motion.span>
      </Button>
    </motion.div>
  )
}

function StatStrip({ analyses, savedRegions }) {
  const analysesReady = !analyses.isLoading && !analyses.isError
  const savedReady = !savedRegions.isLoading && !savedRegions.isError
  const analysesData = analyses.data ?? []
  const savedData = savedRegions.data ?? []

  const cities = new Set(analysesData.map((a) => a.city).filter(Boolean)).size

  const stats = [
    { icon: BarChart3, label: 'Analyses run', value: analysesReady ? analysesData.length : '—', detail: 'Across your workspace' },
    { icon: Bookmark, label: 'Saved locations', value: savedReady ? savedData.length : '—', detail: 'Areas worth revisiting' },
    { icon: MapPinned, label: 'Cities explored', value: analysesReady ? cities : '—', detail: 'Distinct markets searched' },
  ]

  return (
    <div className="grid gap-px overflow-hidden rounded-3xl border border-[#173f31]/10 bg-[#173f31]/10 sm:grid-cols-3">
      {stats.map(({ icon: Icon, label, value, detail }) => (
        <motion.div
          key={label}
          className="group flex items-center gap-4 bg-white px-5 py-5"
          whileHover={{ backgroundColor: '#fbfdfb', transition: { duration: 0.25 } }}
        >
          <motion.span
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-950/10 bg-emerald-50 text-emerald-800"
            whileHover={{ rotate: -6, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          >
            <Icon className="size-5" />
          </motion.span>
          <div className="min-w-0">
            <p className="font-mono text-3xl font-semibold leading-none tracking-[-0.03em] text-[#13231c] tabular-nums">{value}</p>
            <p className="mt-1.5 text-[13px] font-semibold text-[#27372f]">{label}</p>
            <p className="text-[11px] text-[#85938c]">{detail}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function HeroCta({ reduceMotion }) {
  return (
    <section className="relative mt-5 overflow-hidden rounded-[28px] bg-[#14241d] px-6 py-9 text-white shadow-[0_38px_90px_-50px_rgba(13,38,28,.8)] sm:px-10 sm:py-11">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
      <motion.div
        className="contour-field pointer-events-none absolute -right-24 -top-40 size-[520px] opacity-25"
        animate={reduceMotion ? { opacity: 0.25 } : { scale: [1, 1.06, 1], opacity: [0.2, 0.32, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative max-w-xl">
        <motion.span
          className="mb-5 grid size-12 place-items-center rounded-2xl bg-emerald-400 text-[#12251e]"
          animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Compass className="size-6" />
        </motion.span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Start here</p>
        <h2 className="mt-3 text-[clamp(1.85rem,3.5vw,2.6rem)] font-medium leading-[1.02] tracking-[-0.04em]">
          Explore your first <span className="font-serif italic text-emerald-300">opportunity</span> map
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-7 text-emerald-50/65">Choose a business type and a target area. Locus turns backend-scored location signals into one clear, explainable surface.</p>
        <motion.div
          className="mt-7 inline-flex"
          initial="rest"
          animate="rest"
          whileHover="hover"
          whileTap={{ scale: reduceMotion ? 1 : 0.985 }}
          variants={{ rest: { y: 0 }, hover: { y: reduceMotion ? 0 : -2, transition: { type: 'spring', stiffness: 480, damping: 30 } } }}
        >
          <Button className="h-12 rounded-xl bg-white px-6 text-[#14241d] hover:bg-emerald-50" nativeButton={false} render={<Link to="/maps" />}>
            <Sparkles className="size-4" />
            <span>Start exploring</span>
            <motion.span className="-mr-1 inline-flex" variants={{ rest: { x: 0 }, hover: { x: reduceMotion ? 0 : 3 } }} transition={{ type: 'spring', stiffness: 520, damping: 28 }}>
              <ArrowRight className="size-4" />
            </motion.span>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

function Panel({ icon: Icon, title, count, children }) {
  return (
    <section className="h-full rounded-[24px] border border-[#173f31]/10 bg-white p-6 shadow-[0_18px_55px_-48px_rgba(20,57,43,.55)] sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="size-5" /></span>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        {count != null && count > 0 && (
          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-800 tabular-nums">{count}</span>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#173f31]/15 bg-[#f7f8f5] px-6 py-9 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-white text-[#8a978f] shadow-sm"><Icon className="size-5" /></span>
      <p className="max-w-xs text-[13px] leading-6 text-[#65736c]">{text}</p>
    </div>
  )
}

function PanelLoading() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-2xl border border-[#173f31]/8 bg-[#f3f5f1]" />
      ))}
    </div>
  )
}

function RecentAnalysesPanel({ query }) {
  const { data, isLoading, isError } = query
  return (
    <Panel icon={Clock3} title="Recent analyses" count={data?.length}>
      {isLoading && <PanelLoading />}
      {isError && <p className="text-sm text-destructive">Could not load analyses.</p>}
      {!isLoading && !isError && (data?.length ? (
        <ul className="space-y-3">
          {data.map((a) => (
            <AnalysisCard key={a.id} analysis={a} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Clock3} text="Completed analyses will appear here so you can continue comparing areas." />
      ))}
    </Panel>
  )
}

function AnalysisCard({ analysis }) {
  const visibility = useUpdateAnalysisVisibility()
  const visibilityError = visibility.isError ? updateErrorMessage(visibility.error) : null

  return (
    <motion.li whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 360, damping: 24 }}>
      <div className="group rounded-2xl border border-[#173f31]/10 bg-white p-4 transition-colors hover:border-emerald-400 hover:shadow-[0_22px_50px_-38px_rgba(20,57,43,.55)]">
        <Link to="/maps" search={{ analysis: analysis.id }} className="block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#17251f]">{analysis.business_description || 'Untitled analysis'}</p>
              <p className="mt-1 text-[11px] text-[#74827a]">{analysis.city} · top {analysis.requested_result_count} areas</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#8a978f]">
              {formatDate(analysis.created_at)}
              <ArrowUpRight className="size-3.5 text-[#b3bdb6] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600" />
            </span>
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between border-t border-[#173f31]/8 pt-3">
          <VisibilityToggle
            isPublic={analysis.public_shared}
            pending={visibility.isPending}
            onToggle={(next) => visibility.mutate({ id: analysis.id, publicShared: next })}
          />
          {visibilityError && <span className="text-[10px] text-destructive">{visibilityError}</span>}
        </div>
      </div>
    </motion.li>
  )
}

function SavedLocationsPanel({ query, analyses }) {
  const { data, isLoading, isError } = query
  return (
    <Panel icon={Bookmark} title="Saved locations" count={data?.length}>
      {isLoading && <PanelLoading />}
      {isError && <p className="text-sm text-destructive">Could not load saved locations.</p>}
      {!isLoading && !isError && (data?.length ? (
        <ul className="space-y-3">
          {data.map((region) => (
            <SavedRegionCard
              key={region.id}
              region={region}
              parentAnalysis={analyses?.find((analysis) => analysis.id === region.analysis_id)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={Bookmark} text="Save promising areas from the map and revisit them before making a decision." />
      ))}
    </Panel>
  )
}

function SavedRegionCard({ region, parentAnalysis }) {
  const update = useUpdateSavedRegion()
  const remove = useDeleteSavedRegion()
  const visibility = useUpdateSavedRegionVisibility()
  const analysisVisibility = useUpdateAnalysisVisibility()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(region.notes ?? '')

  function startEditing() {
    setNotes(region.notes ?? '')
    setEditing(true)
  }

  function saveEdits() {
    update.mutate({ id: region.id, notes: notes.trim() || null }, { onSuccess: () => setEditing(false) })
  }

  function makeAnalysisAndLocationPublic() {
    analysisVisibility.mutate(
      { id: region.analysis_id, publicShared: true },
      {
        onSuccess: () => visibility.mutate({ id: region.id, publicShared: true }),
      },
    )
  }

  const visibilityError = visibility.isError
    ? updateErrorMessage(
        visibility.error,
        visibility.error?.response?.status === 409 ? 'Make the analysis public first.' : 'Could not update.',
      )
    : null

  return (
    <motion.li
      className="rounded-2xl border border-[#173f31]/10 bg-white p-4 transition-shadow hover:shadow-[0_22px_50px_-40px_rgba(20,57,43,.5)]"
      whileHover={editing ? undefined : { y: -3 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#17251f]">{region.lsoa_name || region.lsoa_code}</p>
          <p className="mt-1 text-[11px] text-[#74827a]">{region.city} · {region.business_description}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#173f31] px-2.5 py-1 font-mono text-[10px] font-semibold text-white tabular-nums"><Flag className="size-3 text-emerald-400" /> {Number(region.final_score).toFixed(3)}</span>
      </div>

      {!editing && (
        <>
          {region.notes && <p className="mt-3 text-[12px] leading-5 text-[#4f5d55]">{region.notes}</p>}
          <div className="mt-3 flex items-center gap-2 border-t border-[#173f31]/8 pt-3">
            {!region.public_shared && parentAnalysis?.public_shared === false ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={analysisVisibility.isPending || visibility.isPending}
                onClick={makeAnalysisAndLocationPublic}
              >
                Make analysis + location public
              </Button>
            ) : (
              <VisibilityToggle
                isPublic={region.public_shared}
                pending={visibility.isPending}
                onToggle={(next) => visibility.mutate({ id: region.id, publicShared: next })}
              />
            )}
            {visibilityError && <span className="text-[10px] text-destructive">{visibilityError}</span>}
            {analysisVisibility.isError && <span className="text-[10px] text-destructive">{updateErrorMessage(analysisVisibility.error)}</span>}
            <div className="ml-auto flex items-center gap-1">
              <Link to="/maps" search={{ analysis: region.analysis_id, region: region.lsoa_code }} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline">
                View <ArrowRight className="size-3" />
              </Link>
              <Button type="button" size="xs" variant="ghost" onClick={startEditing}><Pencil className="size-3.5" /> Edit</Button>
              <Button type="button" size="xs" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => remove.mutate(region.id)}><Trash2 className="size-3.5" /> Delete</Button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <div className="mt-3 space-y-2 border-t border-[#173f31]/8 pt-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (e.g. visited, too expensive)"
            className="w-full rounded-md border border-input bg-white p-2 text-[12px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="xs" onClick={saveEdits} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}><X className="size-3.5" /> Cancel</Button>
          </div>
        </div>
      )}
    </motion.li>
  )
}
