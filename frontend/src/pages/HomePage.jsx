import { Link } from '@tanstack/react-router'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { ArrowRight, BarChart3, Building2, Check, Database, Layers3, MapPinned, MousePointer2, ScanSearch, Sparkles, TrendingUp, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocusLogo } from '@/components/LocusLogo'

const signals = [
  { icon: UsersRound, label: 'Demographics', detail: 'Who lives nearby' },
  { icon: TrendingUp, label: 'Economic activity', detail: 'How the area moves' },
  { icon: Building2, label: 'Market context', detail: 'What already exists' },
  { icon: ScanSearch, label: 'Explainable scoring', detail: 'Why an area ranks' },
]

const steps = [
  { number: '01', icon: Sparkles, title: 'Describe the idea', text: 'Tell Locus what you want to open and who you want to serve. Plain language is enough.' },
  { number: '02', icon: MousePointer2, title: 'Define the search', text: 'Choose a city or draw a precise area directly on the map to keep the analysis relevant.' },
  { number: '03', icon: BarChart3, title: 'Build the shortlist', text: 'Explore scored regions, compare the strongest candidates, and understand what drives each result.' },
]

const mapRestShadow = '0 45px 90px -42px rgba(18,58,42,.5)'
const mapHoverShadow = '0 55px 110px -42px rgba(18,58,42,.58)'
const cardRestShadow = '0 18px 55px -42px rgba(20,57,43,.55)'
const cardHoverShadow = '0 28px 70px -36px rgba(20,57,43,.48)'
const primaryButtonShadow = '0 14px 30px -16px rgba(23,63,49,.75)'
const primaryButtonHoverShadow = '0 20px 42px -18px rgba(23,63,49,.78)'
const secondaryButtonShadow = '0 10px 30px -24px rgba(23,63,49,.4)'
const secondaryButtonHoverShadow = '0 16px 38px -24px rgba(23,63,49,.46)'

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const cardReveal = {
  hidden: { opacity: 0, y: 28, boxShadow: cardRestShadow },
  visible: {
    opacity: 1,
    y: 0,
    boxShadow: cardRestShadow,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } },
}

const viewport = { once: true, amount: 0.18 }

export function HomePage() {
  return (
    <div className="landing-page overflow-x-clip bg-[#f7f6f0] text-[#17251f]">
      <Hero />
      <SignalBand />
      <HowItWorks />
      <ProductStory />
      <FinalCta />
      <LandingFooter />
    </div>
  )
}

function Hero() {
  const reduceMotion = useReducedMotion()
  return (
    <section className="relative isolate border-b border-[#173f31]/10">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(to_right,rgba(23,63,49,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,63,49,.055)_1px,transparent_1px)] [background-size:72px_72px]" />
      <motion.div className="pointer-events-none absolute -left-44 top-12 -z-10 size-[520px] rounded-full border border-emerald-900/5" animate={reduceMotion ? undefined : { rotate: 360, scale: [1, 1.04, 1] }} transition={{ rotate: { duration: 28, repeat: Infinity, ease: 'linear' }, scale: { duration: 14, repeat: Infinity, ease: 'easeInOut' } }} />
      <motion.div className="pointer-events-none absolute -left-28 top-28 -z-10 size-[390px] rounded-full border border-emerald-900/5" animate={reduceMotion ? undefined : { rotate: -360, scale: [1, 1.04, 1] }} transition={{ rotate: { duration: 22, repeat: Infinity, ease: 'linear' }, scale: { duration: 11, repeat: Infinity, ease: 'easeInOut' } }} />
      <motion.div className="pointer-events-none absolute right-[8%] top-[8%] -z-10 size-72 rounded-full bg-emerald-300/20 blur-3xl" animate={reduceMotion ? undefined : { x: [0, -36, 0], y: [0, 28, 0], scale: [1, 1.14, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
      <div className="mx-auto grid min-h-[760px] max-w-[1400px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-12 lg:py-24">
        <motion.div className="relative z-10 max-w-2xl" initial="hidden" animate="visible" variants={reveal}>
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-emerald-950/10 bg-white/70 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-[0_8px_30px_-20px_rgba(13,51,37,.45)] backdrop-blur">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-emerald-600" /></span>
            Location intelligence for independent businesses
          </div>
          <h1 className="max-w-3xl text-[clamp(3.5rem,7vw,6.8rem)] font-medium leading-[0.9] tracking-[-0.072em] text-[#13231c]">Find where your business <span className="font-serif italic tracking-[-0.055em] text-emerald-700">belongs.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#53645c] sm:text-lg sm:leading-8">Turn local demographics, economic activity, and market context into a clear shortlist of places worth exploring.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LandingButton to="/register" icon={<ArrowRight />}>
              Analyze a location
            </LandingButton>
            <LandingButton to="/login" variant="secondary">
              Open your workspace
            </LandingButton>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#697870]">
            <span className="flex items-center gap-2"><Check className="size-3.5 text-emerald-700" />No research team required</span>
            <span className="flex items-center gap-2"><Check className="size-3.5 text-emerald-700" />Built for real location decisions</span>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}><MapPreview /></motion.div>
      </div>
    </section>
  )
}

function SignalBand() {
  return (
    <motion.section id="signals" className="border-b border-[#173f31]/10 bg-[#eeeee7] scroll-mt-24" initial="hidden" whileInView="visible" viewport={viewport} variants={reveal}>
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718078]">A clearer view, built from signals that matter</p>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#173f31]/10 bg-[#173f31]/10 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map(({ icon: Icon, label, detail }) => (
            <motion.div
              key={label}
              className="group flex items-center gap-3 bg-[#f7f6f0] px-4 py-4 sm:px-5"
              variants={reveal}
              whileHover={{
                y: -4,
                backgroundColor: '#ffffff',
                boxShadow: '0 18px 40px -28px rgba(20,57,43,.5)',
                transition: { type: 'spring', stiffness: 420, damping: 28 },
              }}
            >
              <motion.span
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-950/10 bg-emerald-50 text-emerald-800"
                whileHover={{ rotate: -6, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              >
                <Icon className="size-4" />
              </motion.span>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-[#718078]">{detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
      <motion.div className="mx-auto max-w-7xl" initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}>
        <motion.div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end" variants={stagger}>
          <div>
            <motion.p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700" variants={reveal}>
              From idea to shortlist
            </motion.p>
            <motion.h2 className="mt-4 max-w-lg text-4xl font-medium leading-[1.02] tracking-[-0.052em] sm:text-5xl" variants={reveal}>
              A rigorous location search, without the research sprawl.
            </motion.h2>
          </div>
          <motion.p className="max-w-xl text-base leading-7 text-[#65736c] lg:ml-auto" variants={reveal}>
            Locus keeps the workflow deliberately simple. You bring the business idea; the platform turns complex local data into places you can actually evaluate.
          </motion.p>
        </motion.div>
        <motion.div className="mt-14 grid gap-4 lg:grid-cols-3" variants={stagger}>
          {steps.map(({ number, icon: Icon, title, text }) => (
            <motion.article
              key={number}
              variants={cardReveal}
              whileHover={{
                y: -8,
                boxShadow: cardHoverShadow,
                transition: {
                  y: { type: 'spring', stiffness: 350, damping: 24 },
                  boxShadow: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className="group relative overflow-hidden rounded-[24px] border border-[#173f31]/10 bg-white p-6 sm:p-7"
            >
              <div className="flex items-center justify-between">
                <motion.span className="grid size-11 place-items-center rounded-2xl bg-[#e7f0e9] text-emerald-800" whileHover={{ rotate: 6, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  <Icon className="size-5" />
                </motion.span>
                <span className="font-mono text-xs text-[#98a49e]">{number}</span>
              </div>
              <h3 className="mt-9 text-xl font-semibold tracking-[-0.025em]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#68766f]">{text}</p>
              <motion.div className="absolute inset-x-0 bottom-0 h-1 origin-left bg-emerald-600" initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}

function ProductStory() {
  return (
    <section className="px-5 pb-24 sm:px-8 lg:pb-32">
      <motion.div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-[32px] bg-[#14241d] text-white shadow-[0_38px_90px_-50px_rgba(13,38,28,.75)] lg:grid-cols-[0.72fr_1.28fr]" initial="hidden" whileInView="visible" viewport={viewport} variants={reveal}>
        <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">One decision surface</p><h2 className="mt-5 text-4xl font-medium leading-[1.02] tracking-[-0.05em] sm:text-5xl">See the map. Understand the ranking.</h2><p className="mt-6 max-w-md text-sm leading-7 text-white/58">Every result stays connected to the signals behind it. Explore the geography, filter the opportunity surface, and compare candidate regions side by side.</p></div>
          <div className="mt-12 space-y-3 text-sm text-white/75"><p className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-white/8"><Layers3 className="size-3.5 text-emerald-400" /></span>2D and 3D opportunity views</p><p className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-white/8"><MapPinned className="size-3.5 text-emerald-400" /></span>Custom search-area selection</p><p className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-white/8"><BarChart3 className="size-3.5 text-emerald-400" /></span>Region-to-region comparison</p></div>
        </div>
        <div className="min-h-[560px] bg-[#dde3dc] p-3 sm:p-5 lg:min-h-[650px]"><ProductWorkspacePreview /></div>
      </motion.div>
    </section>
  )
}

function FinalCta() {
  const reduceMotion = useReducedMotion()
  return <section className="px-5 pb-20 sm:px-8"><motion.div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-emerald-950/10 bg-[#e4eee5] px-6 py-14 text-center sm:px-10 sm:py-20" initial="hidden" whileInView="visible" viewport={viewport} variants={reveal}><motion.div className="contour-field pointer-events-none absolute inset-0" animate={reduceMotion ? { opacity: 0.35 } : { scale: [1, 1.06, 1], opacity: [0.35, 0.5, 0.35] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} /><div className="relative"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Your next location starts with a better question</p><h2 className="mx-auto mt-4 max-w-3xl text-4xl font-medium leading-[1.02] tracking-[-0.05em] sm:text-5xl">Turn a business idea into a place you can believe in.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#5d6d64]">Describe what you want to build. Locus will help you understand where it has the strongest foundation.</p><LandingButton className="mt-8" to="/register" icon={<ArrowRight />}>Start your first analysis</LandingButton></div></motion.div></section>
}

function LandingButton({ children, className = '', icon, to, variant = 'primary' }) {
  const reduceMotion = useReducedMotion()
  const isPrimary = variant === 'primary'

  return (
    <motion.div
      className={`inline-flex ${className}`}
      initial="rest"
      animate="rest"
      variants={{
        rest: { y: 0, scale: 1, boxShadow: isPrimary ? primaryButtonShadow : secondaryButtonShadow },
        hover: {
          y: reduceMotion ? 0 : -2,
          scale: 1,
          boxShadow: isPrimary ? primaryButtonHoverShadow : secondaryButtonHoverShadow,
          transition: {
            y: { type: 'spring', stiffness: 480, damping: 30 },
            boxShadow: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
          },
        },
        tap: { y: 0, scale: reduceMotion ? 1 : 0.985 },
      }}
      whileHover="hover"
      whileTap="tap"
    >
      <Button
        size="lg"
        variant={isPrimary ? 'default' : 'outline'}
        className={isPrimary
          ? 'h-12 rounded-xl bg-[#173f31] px-6 text-white transition-colors duration-300 hover:bg-[#215541]'
          : 'h-12 rounded-xl border-emerald-950/15 bg-white/65 px-6 text-[#173f31] transition-colors duration-300 hover:bg-white'}
        nativeButton={false}
        render={<Link to={to} />}
      >
        <span>{children}</span>
        {icon ? (
          <motion.span
            className="-mr-1 inline-flex"
            variants={{
              rest: { x: 0 },
              hover: { x: reduceMotion ? 0 : 3 },
            }}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
          >
            {icon}
          </motion.span>
        ) : null}
      </Button>
    </motion.div>
  )
}

function LandingFooter() {
  return <footer className="border-t border-[#173f31]/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><LocusLogo /><p className="text-xs text-[#728078]">Location intelligence for thoughtful business decisions.</p><div className="flex gap-5 text-xs font-medium"><a href="#signals" className="hover:text-emerald-700">Signals</a><a href="#how-it-works" className="hover:text-emerald-700">How it works</a><Link to="/login" className="hover:text-emerald-700">Log in</Link></div></div></footer>
}

function MapPreview() {
  const reduceMotion = useReducedMotion()
  const rotateXTarget = useMotionValue(0)
  const rotateYTarget = useMotionValue(0)
  const rotateX = useSpring(rotateXTarget, { stiffness: 180, damping: 24, mass: 0.5 })
  const rotateY = useSpring(rotateYTarget, { stiffness: 180, damping: 24, mass: 0.5 })

  function handlePointerMove(event) {
    if (reduceMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    rotateXTarget.set(y * -4)
    rotateYTarget.set(x * 5)
  }

  function resetPointer() {
    rotateXTarget.set(0)
    rotateYTarget.set(0)
  }

  return (
    <div className="relative mx-auto w-full max-w-[760px] lg:translate-x-4" onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
      <div className="absolute -inset-10 -z-10 rounded-full bg-emerald-300/15 blur-3xl" />
      <motion.div
        className="overflow-hidden rounded-[30px] border border-white/80 bg-white/55 p-2.5 backdrop-blur will-change-transform"
        initial={{ boxShadow: mapRestShadow }}
        animate={{ boxShadow: mapRestShadow }}
        style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: 'preserve-3d' }}
        transition={{ boxShadow: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
        whileHover={reduceMotion ? undefined : { boxShadow: mapHoverShadow }}
      >
        <div className="relative h-[500px] overflow-hidden rounded-[22px] bg-[#dfe5de] sm:h-[570px]">
          <MapArtwork />
          <div className="absolute left-4 right-4 top-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/88 p-3 shadow-[0_12px_35px_-20px_rgba(24,48,38,.5)] backdrop-blur-md sm:left-5 sm:right-auto sm:w-[360px]"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><MapPinned className="size-4" /></span><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.14em] text-[#75827b]">Opportunity map</p><p className="truncate text-sm font-semibold">Independent café · London</p></div><span className="ml-auto hidden rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 sm:block">Ready</span></div>
          <div className="absolute bottom-4 left-4 w-[210px] rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-lg backdrop-blur sm:bottom-5 sm:left-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#75827b]">Opportunity score</p><div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-[#244a75] via-[#2d9971] to-[#eab945]" /><div className="mt-1.5 flex justify-between text-[9px] text-[#7a8780]"><span>Lower</span><span>Higher</span></div></div>
          <div className="absolute bottom-4 right-4 hidden w-[230px] space-y-2 sm:block"><RankCard rank="01" area="Southwark 009H" score="0.94" active /><RankCard rank="02" area="Lambeth 015C" score="0.89" /></div>
          <motion.div className="absolute right-5 top-24 hidden items-center gap-2 rounded-full border border-white/80 bg-white/88 px-3 py-2 text-[10px] font-semibold text-emerald-800 shadow-lg backdrop-blur sm:flex" animate={reduceMotion ? undefined : { y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}><span className="size-1.5 rounded-full bg-emerald-500" />Scoring 4,835 regions</motion.div>
        </div>
      </motion.div>
    </div>
  )
}

function MapArtwork() {
  const reduceMotion = useReducedMotion()
  return <svg className="absolute inset-0 size-full" viewBox="0 0 700 570" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="700" height="570" fill="#dfe5de"/><g fill="none" stroke="#f8faf7" strokeLinecap="round"><path d="M-20 90 C130 125 190 40 330 82 S560 155 735 70" strokeWidth="18"/><path d="M72 -20 C105 125 38 205 110 330 S155 470 90 600" strokeWidth="12"/><path d="M310 -30 C278 120 368 190 325 315 S298 465 370 610" strokeWidth="10"/><path d="M520 -20 C470 110 540 210 490 330 S545 470 510 600" strokeWidth="15"/><path d="M-20 405 C125 350 210 430 350 382 S570 332 730 420" strokeWidth="13"/></g><motion.g fill="none" stroke="#88a195" strokeWidth="2" strokeDasharray="8 8" animate={reduceMotion ? undefined : { strokeDashoffset: [0, -48] }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}><path d="M-10 205 L145 166 L245 224 L390 185 L505 240 L710 190"/><path d="M15 505 L145 445 L248 495 L410 445 L565 505 L710 470"/><path d="M190 -10 L165 145 L215 285 L180 410 L230 590"/><path d="M620 -10 L590 145 L640 275 L602 410 L650 590"/></motion.g><motion.g stroke="#f7faf6" strokeWidth="3" animate={reduceMotion ? undefined : { opacity: [0.92, 0.7, 0.92] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}><path d="M168 185 L260 156 L309 221 L241 288 L151 257 Z" fill="#327d61"/><path d="M311 222 L407 182 L469 246 L421 330 L323 315 L241 288 Z" fill="#e0b84d"/><path d="M421 331 L520 276 L590 342 L554 438 L448 423 L377 382 Z" fill="#dc755c"/><path d="M150 258 L241 289 L322 315 L286 402 L177 416 L112 341 Z" fill="#4a9b78"/><path d="M288 403 L377 383 L448 424 L409 506 L303 492 L238 451 Z" fill="#275b7d"/></motion.g><motion.g fill="#173f31" animate={reduceMotion ? undefined : { opacity: [1, 0.55, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}><circle cx="239" cy="224" r="7"/><circle cx="394" cy="258" r="7"/><circle cx="480" cy="369" r="7"/></motion.g><motion.g fill="none" stroke="#173f31" animate={reduceMotion ? { opacity: 0.12 } : { opacity: [0.08, 0.18, 0.08], scale: [0.98, 1.025, 0.98] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '390px 285px' }}><ellipse cx="390" cy="285" rx="250" ry="175"/><ellipse cx="390" cy="285" rx="205" ry="140"/><ellipse cx="390" cy="285" rx="158" ry="105"/></motion.g></svg>
}

function RankCard({ rank, area, score, active = false }) {
  return <div className={`flex items-center gap-3 rounded-xl border p-3 shadow-lg backdrop-blur ${active ? 'border-emerald-500/30 bg-[#173f31] text-white' : 'border-white/80 bg-white/90 text-[#17251f]'}`}><span className={`grid size-7 place-items-center rounded-lg text-[10px] font-bold ${active ? 'bg-emerald-400 text-[#13231c]' : 'bg-emerald-50 text-emerald-800'}`}>{rank}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{area}</p><p className={`mt-0.5 text-[9px] ${active ? 'text-white/50' : 'text-[#7b8781]'}`}>Recommended region</p></div><span className="ml-auto font-mono text-xs font-semibold">{score}</span></div>
}

function ProductWorkspacePreview() {
  return <div className="relative h-full min-h-[530px] overflow-hidden rounded-[22px] bg-[#e0e5df]"><MapArtwork /><div className="absolute inset-y-3 left-3 w-[min(42%,290px)] rounded-2xl border border-white/80 bg-white/94 p-4 shadow-xl backdrop-blur"><div className="flex items-center gap-2 border-b pb-3"><span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Database className="size-4" /></span><div><p className="text-[9px] uppercase tracking-[0.14em] text-[#7b8781]">Current analysis</p><p className="text-xs font-semibold text-[#17251f]">Specialty coffee shop</p></div></div><p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b8781]">Top regions</p><div className="mt-2 space-y-2"><MiniRegion rank="1" name="Southwark 009H" score="0.94"/><MiniRegion rank="2" name="Lambeth 015C" score="0.89"/><MiniRegion rank="3" name="Camden 007B" score="0.86"/></div><div className="mt-4 rounded-xl bg-[#14241d] p-3 text-white"><p className="flex items-center gap-2 text-[10px] font-semibold"><BarChart3 className="size-3.5 text-emerald-400"/>Compare regions</p><div className="mt-2 flex gap-1"><span className="h-1.5 flex-1 rounded-full bg-emerald-400"/><span className="h-1.5 flex-1 rounded-full bg-amber-300"/><span className="h-1.5 flex-1 rounded-full bg-sky-300"/></div><p className="mt-2 text-[9px] text-white/50">3 candidates selected</p></div></div><div className="absolute bottom-4 right-4 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-[10px] font-medium text-[#17251f] shadow-lg backdrop-blur">Right-click a region to compare</div></div>
}

function MiniRegion({ rank, name, score }) {
  return <div className="flex items-center gap-2 rounded-xl border border-[#173f31]/8 bg-[#f7f8f5] p-2.5"><span className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-[9px] font-bold text-emerald-800">{rank}</span><span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#27372f]">{name}</span><span className="font-mono text-[9px] font-semibold text-emerald-800">{score}</span></div>
}
