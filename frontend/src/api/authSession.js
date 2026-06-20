const SESSION_KEY = 'locus-auth-session'

export function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function saveAuthSession(tokens, email) {
  const previous = getAuthSession()
  const session = { ...tokens, email: email || previous?.email }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function sessionUser() {
  const email = getAuthSession()?.email
  return email ? { id: email, name: email.split('@')[0], email } : null
}
