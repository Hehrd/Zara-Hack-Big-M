import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LocusMark } from '@/components/LocusLogo'
import { useAppStore } from '@/store/appStore'
import { logIn, signUp } from '@/api/auth'
import { saveAuthSession } from '@/api/authSession'

export function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const setUser = useAppStore((state) => state.setUser)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')?.trim()
    const password = formData.get('password')

    if (!email || !password) {
      setError('Please complete all fields.')
      return
    }

    if (isRegister && password !== formData.get('confirmPassword')) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      if (isRegister) await signUp({ email, password })
      const tokens = await logIn({ email, password })
      saveAuthSession(tokens, email)
      setUser({ id: email, name: email.split('@')[0], email })
      navigate({ to: '/dashboard' })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to connect to the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-2 lg:px-8">
      <section className="relative hidden min-h-[610px] overflow-hidden rounded-[32px] bg-[#193128] p-10 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="contour-field absolute -right-36 -top-32 size-[720px] opacity-40" />
        <div className="absolute left-[28%] top-[28%] size-44 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative"><span className="mb-6 grid size-12 place-items-center rounded-2xl bg-emerald-400 text-[#14251e]"><LocusMark /></span><p className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.045em]">Open your next shop with a clearer view.</p><p className="mt-4 max-w-md leading-7 text-emerald-50/65">Explore population, competition, and local density as one understandable opportunity map.</p></div>
      </section>
      <section className="mx-auto w-full max-w-md">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{isRegister ? 'Create your workspace' : 'Welcome back'}</p>
        <h1 className="text-4xl font-semibold tracking-[-0.045em]">{isRegister ? 'Start finding your next location.' : 'Continue your search.'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{isRegister ? 'Set up your free Locus workspace in less than a minute.' : 'Log in to return to your analyses and saved locations.'}</p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-sm font-medium">
            Email
            <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Password
            <Input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="••••••••" />
          </label>
          {isRegister && (
            <label className="block space-y-1.5 text-sm font-medium">
              Confirm password
              <Input name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" />
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="mt-2 h-10 w-full" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isRegister ? 'Already registered?' : 'Need an account?'}{' '}
          <Link className="font-medium text-primary hover:underline" to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Log in' : 'Register'}
          </Link>
        </p>
      </section>
    </div>
  )
}
