import { Activity, Bell, Gauge, House, Menu, Radio } from 'lucide-react'
import { Link, Outlet } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

const links = [
  { to: '/', label: 'Home', icon: House },
  { to: '/health', label: 'Health', icon: Activity },
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/devices', label: 'Devices', icon: Radio },
  { to: '/alerts', label: 'Alerts', icon: Bell },
]

export function AppShell() {
  const { modalOpen, setModalOpen, sidebarOpen, toggleSidebar, user } = useAppStore()
  const navClassName = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground'

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className={cn('border-r bg-card p-4 md:block', sidebarOpen ? 'block' : 'hidden')}>
        <div className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">Z</span>
          ZaraHack Starter
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              onClick={() => sidebarOpen && toggleSidebar()}
              className={navClassName}
              activeProps={{ className: cn(navClassName, 'bg-accent text-accent-foreground') }}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
          <Button variant="outline" size="icon" className="md:hidden" onClick={toggleSidebar} aria-label="Toggle navigation">
            <Menu />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>Quick note</Button>
            <p className="hidden text-sm text-muted-foreground sm:block">{user.name}</p>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hackathon note</DialogTitle>
              <DialogDescription>This controlled dialog and input demonstrate Zustand-backed UI state.</DialogDescription>
            </DialogHeader>
            <Input placeholder="Capture the next idea…" autoFocus />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
