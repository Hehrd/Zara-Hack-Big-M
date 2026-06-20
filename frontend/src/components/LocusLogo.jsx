import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function LocusMark({ className }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('size-9', className)} fill="none">
      <path d="M7 22c0-8 5.4-14 13-14 7 0 12 4.7 12 11 0 7.8-6.8 14-15 14-5.8 0-10-3.7-10-9.3 0-5.4 4.2-9.7 10-9.7 5.1 0 8.5 3.2 8.5 7.2 0 4.2-3.5 7.3-7.6 7.3-3.1 0-5.4-2-5.4-4.8 0-2.7 2.2-4.8 4.9-4.8 2 0 3.5 1.2 3.5 2.9 0 1.5-1.2 2.6-2.7 2.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18.2" cy="21.8" r="1.8" fill="currentColor" />
    </svg>
  )
}

export function LocusLogo({ compact = false }) {
  return (
    <Link to="/" aria-label="Locus home" className="inline-flex items-center gap-2.5 text-foreground">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><LocusMark /></span>
      {!compact && <span className="text-xl font-semibold tracking-[-0.04em]">locus</span>}
    </Link>
  )
}
