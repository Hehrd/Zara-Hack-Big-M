import { Link } from '@tanstack/react-router'
import { ArrowRight, Blocks, Bot, PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

const features = [
  { icon: PlugZap, title: 'Mock first', text: 'Build every screen now; switch one environment variable when Spring Boot arrives.' },
  { icon: Bot, title: 'Agent readable', text: 'Feature boundaries and conventions are documented for fast AI collaboration.' },
  { icon: Blocks, title: 'Ready to compose', text: 'Routing, server state, client state, styling, and base UI primitives are wired.' },
]

export function HomePage() {
  return (
    <>
      <PageHeader eyebrow="Frontend foundation" title="Ship the idea, not the plumbing." description="A deliberately small React starter for moving quickly without turning the codebase into a mystery box." />
      <Button nativeButton={false} render={<Link to="/health" />}>Verify the stack <ArrowRight /></Button>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardHeader><Icon className="size-5 text-primary" /><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
