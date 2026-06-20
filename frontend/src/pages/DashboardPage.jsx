import { Link } from '@tanstack/react-router'
import { ArrowRight, Bookmark, Clock3, Compass, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DashboardPage() {
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
        <EmptyPanel icon={Clock3} title="Recent analyses" text="Completed analyses will appear here so you can continue comparing areas." />
        <EmptyPanel icon={Bookmark} title="Saved locations" text="Save promising areas from the map and revisit them before making a decision." />
      </div>
      <div className="mt-8 flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm text-muted-foreground"><Map className="size-5 text-emerald-700" /><span>No fabricated results—your workspace fills up only after you run an analysis.</span></div>
    </div>
  )
}

function EmptyPanel({ icon: Icon, title, text }) {
  return <section className="rounded-3xl border bg-white p-7"><span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-5" /></span><h2 className="mt-8 text-lg font-semibold">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p><div className="mt-7 h-px bg-border" /><p className="mt-4 text-xs font-medium text-muted-foreground">Nothing here yet</p></section>
}
