import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowRight, Clock3, MapPin, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { useFriendAnalyses, useFriendLocations, useFriends, useRemoveFriend } from '@/hooks/useFriends'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function FriendsPage() {
  const { friend: selectedId } = useSearch({ strict: false })
  const friends = useFriends()

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-12">
      <PageHeader
        eyebrow="Network"
        title="Friends"
        description="Add friends with their link, then browse the location analyses they've run."
      />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <FriendsListPanel query={friends} selectedId={selectedId} />
        <div className="space-y-5">
          <FriendAnalysesPanel selectedId={selectedId} friends={friends.data} />
          {selectedId != null && <FriendLocationsPanel selectedId={selectedId} />}
        </div>
      </div>
    </div>
  )
}

function FriendsListPanel({ query, selectedId }) {
  const { data, isLoading, isError } = query
  const remove = useRemoveFriend()
  const navigate = useNavigate()

  function handleRemove(id) {
    remove.mutate(id, {
      onSuccess: () => {
        if (String(selectedId) === String(id)) navigate({ to: '/friends', search: {} })
      },
    })
  }

  return (
    <section className="rounded-3xl border bg-white p-5 lg:h-fit">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Users className="size-5" /></span>
        <h2 className="text-lg font-semibold">Your friends</h2>
      </div>
      <div className="mt-5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-destructive">Could not load friends.</p>}
        {!isLoading && !isError && (data?.length ? (
          <ul className="space-y-2">
            {data.map((friend) => {
              const active = String(selectedId) === String(friend.id)
              return (
                <li key={friend.id} className={`flex items-center gap-2 rounded-2xl border p-3 transition ${active ? 'border-emerald-500 bg-emerald-50/50' : 'hover:border-emerald-300'}`}>
                  <Link to="/friends" search={{ friend: friend.id }} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{friend.email}</p>
                    <p className="text-[11px] text-muted-foreground">View analyses</p>
                  </Link>
                  <Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={remove.isPending} onClick={() => handleRemove(friend.id)} aria-label={`Remove ${friend.email}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed p-5 text-center">
            <UserPlus className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">No friends yet. Share your add-friend link from Settings, or open a friend's link.</p>
            <Button className="mt-3" size="sm" nativeButton={false} render={<Link to="/settings" />}>Get my link</Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function FriendAnalysesPanel({ selectedId, friends }) {
  const query = useFriendAnalyses(selectedId != null ? selectedId : undefined)
  const friend = friends?.find((f) => String(f.id) === String(selectedId))

  if (selectedId == null) {
    return (
      <section className="grid place-items-center rounded-3xl border border-dashed bg-white p-10 text-center">
        <div>
          <Clock3 className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Select a friend to see their analyses.</p>
        </div>
      </section>
    )
  }

  const { data, isLoading, isError } = query

  return (
    <section className="rounded-3xl border bg-white p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Clock3 className="size-5" /></span>
        <div>
          <h2 className="text-lg font-semibold">Analyses</h2>
          {friend && <p className="text-sm text-muted-foreground">{friend.email}</p>}
        </div>
      </div>
      <div className="mt-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-destructive">Could not load this friend's analyses.</p>}
        {!isLoading && !isError && (data?.length ? (
          <ul className="space-y-3">
            {data.map((a) => (
              <li key={a.id}>
                <Link
                  to="/friends/$friendId/analyses/$analysisId"
                  params={{ friendId: String(selectedId), analysisId: String(a.id) }}
                  className="block rounded-2xl border bg-white p-4 transition hover:border-emerald-400 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.business_description || 'Untitled analysis'}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{a.city} · top {a.requested_result_count} areas</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">{formatDate(a.created_at)} <ArrowRight className="size-3" /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">This friend hasn't saved any analyses yet.</p>
        ))}
      </div>
    </section>
  )
}

function FriendLocationsPanel({ selectedId }) {
  const { data, isLoading, isError } = useFriendLocations(selectedId != null ? selectedId : undefined)

  return (
    <section className="rounded-3xl border bg-white p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><MapPin className="size-5" /></span>
        <h2 className="text-lg font-semibold">Saved locations</h2>
      </div>
      <div className="mt-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-destructive">Could not load this friend's locations.</p>}
        {!isLoading && !isError && (data?.length ? (
          <ul className="space-y-3">
            {data.map((loc) => (
              <li key={loc.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{loc.lsoa_name || loc.lsoa_code}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{loc.city} · score {loc.final_score?.toFixed(2)}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(loc.created_at)}</span>
                </div>
                {loc.notes && <p className="mt-2 text-xs text-muted-foreground">{loc.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">This friend hasn't shared any saved locations yet.</p>
        ))}
      </div>
    </section>
  )
}
