import { Link } from '@tanstack/react-router'
import { ArrowRight, Building2, MapPinned, ScanSearch, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

const signals = [
  { icon: UsersRound, title: 'Population fit', text: 'Understand where the right customers live and move.' },
  { icon: Building2, title: 'Market context', text: 'See competition and complementary businesses together.' },
  { icon: ScanSearch, title: 'Clear opportunity', text: 'Turn complex spatial signals into one readable map.' },
]

export function HomePage() {
  return (
    <div>
      <section className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" /> Location intelligence for independent businesses
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Find where your business fits.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Locus turns population, competition, and local business density into a clear opportunity map—so your next location is an informed decision.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" className="h-11 px-5" nativeButton={false} render={<Link to="/register" />}>Start exploring <ArrowRight /></Button>
            <Button size="lg" variant="outline" className="h-11 bg-white px-5" nativeButton={false} render={<Link to="/login" />}>View your workspace</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Built for owners opening their next shop—not market research teams.</p>
        </div>
        <MapPreview />
      </section>

      <section className="border-y bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-3 lg:px-8">
          {signals.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="size-5" /></span>
              <div><p className="mb-1 text-xs font-semibold tracking-widest text-emerald-700">0{index + 1}</p><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MapPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-12 -z-10 rounded-full bg-emerald-200/25 blur-3xl" />
      <div className="overflow-hidden rounded-[28px] border border-white/80 bg-[#e9ece4] p-3 shadow-[0_35px_80px_-30px_rgba(19,52,39,.35)]">
        <div className="relative h-[450px] overflow-hidden rounded-[20px] bg-[#e5e8e0]">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(29deg, transparent 48%, #fff 49% 51%, transparent 52%), linear-gradient(115deg, transparent 47%, #d4d9d0 48% 50%, transparent 51%)', backgroundSize: '90px 75px, 130px 110px' }} />
          <div className="absolute left-[18%] top-[18%] size-56 rounded-full bg-emerald-400/55 blur-3xl" />
          <div className="absolute bottom-[8%] right-[8%] size-48 rounded-full bg-amber-300/45 blur-3xl" />
          <div className="contour-field absolute inset-0 opacity-80" />
          <div className="absolute left-5 right-5 top-5 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-lg backdrop-blur">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MapPinned className="size-4" /></span>
            <div><p className="text-xs text-muted-foreground">Exploring</p><p className="text-sm font-semibold">Independent café · Sofia</p></div>
            <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Analysis ready</span>
          </div>
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/92 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between text-xs font-medium"><span>Lower fit</span><span>Higher fit</span></div>
            <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
