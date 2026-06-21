import { Globe, Lock } from 'lucide-react'

export function VisibilityToggle({ isPublic, onToggle, pending = false }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isPublic)}
      disabled={pending}
      aria-pressed={isPublic}
      title={isPublic ? 'Public — friends can see this. Click to make private.' : 'Private — only you can see this. Click to make public.'}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isPublic
          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          : 'bg-[#173f31]/5 text-[#65736c] hover:bg-[#173f31]/10'
      }`}
    >
      {isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
      {isPublic ? 'Public' : 'Private'}
    </button>
  )
}
