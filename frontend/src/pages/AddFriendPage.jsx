import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from '@tanstack/react-router'
import { LoaderCircle, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addFriend } from '@/api/friends'
import { useAppStore } from '@/store/appStore'

const PENDING_KEY = 'locus-pending-friend-token'

export function AddFriendPage() {
  const { token } = useParams({ strict: false })
  const navigate = useNavigate()
  const user = useAppStore((state) => state.user)
  const [status, setStatus] = useState('working') // working | error
  const [message, setMessage] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!user) {
      // Defer until the visitor logs in, then the login flow can complete the add.
      sessionStorage.setItem(PENDING_KEY, token)
      navigate({ to: '/login', replace: true })
      return
    }

    addFriend(token)
      .then((friend) => {
        sessionStorage.removeItem(PENDING_KEY)
        navigate({ to: '/friends', search: { friend: friend.id }, replace: true })
      })
      .catch((error) => {
        setStatus('error')
        setMessage(error.response?.data?.message || 'This add-friend link is invalid or could not be used.')
      })
  }, [navigate, token, user])

  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center">
        {status === 'working' && (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><LoaderCircle className="size-6 animate-spin" /></span>
            <h1 className="mt-4 text-xl font-semibold">Adding friend…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Connecting your accounts.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"><UserX className="size-6" /></span>
            <h1 className="mt-4 text-xl font-semibold">Could not add friend</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button className="mt-5" nativeButton={false} render={<Link to="/friends" search={{}} />}><UserCheck className="size-4" /> Go to friends</Button>
          </>
        )}
      </div>
    </div>
  )
}

export { PENDING_KEY }
