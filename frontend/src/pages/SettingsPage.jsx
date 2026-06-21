import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Link2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { useAccount, useUpdateCredentials } from '@/hooks/useAccount'
import { useAppStore } from '@/store/appStore'
import { getAuthSession, saveAuthSession } from '@/api/authSession'

function buildFriendLink(token) {
  if (!token) return ''
  return `${window.location.origin}/api/add-friend/${token}`
}

export function SettingsPage() {
  const { data: account, isLoading, isError } = useAccount()

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-12">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Update your sign-in credentials and share your personal add-friend link."
      />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="text-sm text-destructive">Could not load your account.</p>}
      {account && (
        <div className="space-y-6">
          <FriendLinkPanel token={account.friend_token} />
          <CredentialsPanel account={account} />
        </div>
      )}
    </div>
  )
}

function Panel({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-3xl border bg-white p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-5" /></span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function FriendLinkPanel({ token }) {
  const [copied, setCopied] = useState(false)
  const link = buildFriendLink(token)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Panel icon={Link2} title="Your add-friend link" description="Anyone you share this with can add you and view your analyses.">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy</>}
        </Button>
      </div>
    </Panel>
  )
}

function CredentialsPanel({ account }) {
  const update = useUpdateCredentials()
  const setUser = useAppStore((state) => state.setUser)
  const [email, setEmail] = useState(account.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { setEmail(account.email) }, [account.email])

  function submit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const emailChanged = email.trim() && email.trim() !== account.email
    const wantsNewPassword = Boolean(newPassword)

    if (!emailChanged && !wantsNewPassword) {
      setError('Change your email or enter a new password first.')
      return
    }
    if (!currentPassword) {
      setError('Enter your current password to save changes.')
      return
    }
    if (wantsNewPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    const payload = { current_password: currentPassword }
    if (emailChanged) payload.email = email.trim()
    if (wantsNewPassword) payload.new_password = newPassword

    update.mutate(payload, {
      onSuccess: (data) => {
        setSuccess('Your credentials were updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setUser({ id: data.email, name: data.email.split('@')[0], email: data.email })
        saveAuthSession(getAuthSession() || {}, data.email)
      },
      onError: (err) => setError(err.response?.data?.message || 'Could not update credentials.'),
    })
  }

  return (
    <Panel icon={KeyRound} title="Credentials" description="Changing email or password requires your current password.">
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5"><Mail className="size-4 text-muted-foreground" /> Email</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <div className="h-px bg-border" />
        <label className="block space-y-1.5 text-sm font-medium">
          Current password
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          New password <span className="text-xs font-normal text-muted-foreground">(leave blank to keep current)</span>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Confirm new password
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
        <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
      </form>
    </Panel>
  )
}
