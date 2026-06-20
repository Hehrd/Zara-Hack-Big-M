export function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
    </header>
  )
}
