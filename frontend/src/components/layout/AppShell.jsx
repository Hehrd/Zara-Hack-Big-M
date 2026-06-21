import { BarChart3, Compass, LogOut, Menu, Plus, Settings, Users, UserRound, X } from 'lucide-react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { LocusLogo } from '@/components/LocusLogo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { logOut } from '@/api/auth'
import { clearAuthSession, getAuthSession } from '@/api/authSession'
import { queryClient } from '@/api/queryClient'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

const productLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/maps', label: 'Explore', icon: Compass },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const setUser = useAppStore((state) => state.setUser)
  const navigate = useNavigate()
  const isPublic = pathname === '/' || pathname === '/login' || pathname === '/register'
    || pathname.startsWith('/api/add-friend')

  useEffect(() => {
    const handleExpired = () => {
      clearAuthSession()
      queryClient.clear()
      setUser(null)
      navigate({ to: '/login', replace: true })
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [navigate, setUser])

  return isPublic ? <PublicShell isHome={pathname === '/'} /> : <ProductShell />
}

function PublicShell({ isHome }) {
  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-emerald-950/8 bg-[#f7f6f0]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <LocusLogo />
          {isHome && <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-xs font-medium text-[#5e6d65] md:flex" aria-label="Landing page"><a href="#how-it-works" className="hover:text-[#173f31]">How it works</a><a href="#signals" className="hover:text-[#173f31]">Signals</a></nav>}
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Account">
            <Button variant="ghost" className="h-9 px-3 text-[#4f6057]" nativeButton={false} render={<Link to="/login" />}>Log in</Button>
            <Button className="h-9 rounded-lg bg-[#173f31] px-3.5 text-white hover:bg-[#215541] sm:px-4" nativeButton={false} render={<Link to="/register" />}>{isHome ? 'Analyze a location' : 'Get started'}</Button>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
    </div>
  )
}

function ProductShell() {
  const { sidebarOpen, toggleSidebar, user, setUser } = useAppStore()
  const navigate = useNavigate()
  const linkClass = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/8 hover:text-white'

  useEffect(() => {
    if (!user) navigate({ to: '/login', replace: true })
  }, [navigate, setUser, user])

  async function handleLogout() {
    const refreshToken = getAuthSession()?.refreshToken
    try {
      if (refreshToken) await logOut(refreshToken)
    } finally {
      clearAuthSession()
      setUser(null)
      navigate({ to: '/login', replace: true })
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#f6f7f3] lg:grid lg:grid-cols-[232px_1fr]">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col bg-[#14211c] p-4 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="mb-8 flex items-center justify-between px-1">
          <div className="[&_a]:text-white [&_span:first-child]:bg-emerald-500"><LocusLogo /></div>
          <Button variant="ghost" size="icon" className="text-white lg:hidden" onClick={toggleSidebar} aria-label="Close navigation"><X /></Button>
        </div>
        <Button className="mb-6 bg-emerald-500 text-[#102019] hover:bg-emerald-400" nativeButton={false} render={<Link to="/maps" />}>
          <Plus /> New analysis
        </Button>
        <nav className="space-y-1">
          {productLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => sidebarOpen && toggleSidebar()} className={linkClass} activeProps={{ className: cn(linkClass, 'bg-white/10 text-white') }}>
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="grid size-9 place-items-center rounded-full bg-white/10"><UserRound className="size-4" /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-xs text-slate-400">Owner account</p></div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out" className="text-slate-400 hover:text-white"><LogOut className="size-4" /></Button>
          </div>
        </div>
      </aside>
      {sidebarOpen && <button className="fixed inset-0 z-30 bg-black/35 lg:hidden" aria-label="Close navigation" onClick={toggleSidebar} />}
      <div className="min-w-0">
        <header className="flex h-16 items-center border-b bg-white/85 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open navigation"><Menu /></Button>
          <div className="mx-auto"><LocusLogo compact /></div>
          <span className="size-8" />
        </header>
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen"><Outlet /></main>
      </div>
    </div>
  )
}
