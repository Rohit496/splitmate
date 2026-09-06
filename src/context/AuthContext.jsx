import { createContext, useCallback, useContext, useMemo } from 'react'
import * as storage from '../data/storage.js'
import { useStoreVersion } from '../hooks/useStore.js'
import { content } from '../constant.js'

const copy = content.auth

/**
 * All authentication logic lives here. No other module reads passwords, checks
 * credentials, or touches the session — they call the functions on this context.
 *
 * Passwords are compared in plain text against locally stored records. That is
 * deliberate for local testing and is the first thing to change when this moves
 * to a real backend.
 */

const AuthContext = createContext(null)

/** Strips the password before a user record is exposed to the rest of the app. */
function toPublicUser(record) {
  if (!record) return null
  return { id: record.id, name: record.name, email: record.email }
}

export function AuthProvider({ children }) {
  const version = useStoreVersion()

  const user = useMemo(
    () => toPublicUser(storage.getUserById(storage.getSessionUserId())),
    [version],
  )

  const register = useCallback(({ name, email, password }) => {
    const trimmedName = String(name ?? '').trim()
    const normalizedEmail = storage.normalizeEmail(email)

    if (!trimmedName) return { ok: false, error: copy.nameRequiredError }
    if (!normalizedEmail.includes('@')) return { ok: false, error: copy.invalidEmailError }
    if (!password || password.length < 6) {
      return { ok: false, error: copy.passwordTooShortError }
    }
    if (storage.getUserByEmail(normalizedEmail)) {
      return { ok: false, error: copy.emailTakenError }
    }

    const record = storage.createUser({ name: trimmedName, email: normalizedEmail, password })
    storage.setSessionUserId(record.id)
    return { ok: true, user: toPublicUser(record) }
  }, [])

  const login = useCallback(({ email, password }) => {
    const record = storage.getUserByEmail(email)
    if (!record || record.password !== password) {
      return { ok: false, error: copy.credentialsMismatchError }
    }
    storage.setSessionUserId(record.id)
    return { ok: true, user: toPublicUser(record) }
  }, [])

  const logout = useCallback(() => {
    storage.clearSession()
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), register, login, logout }),
    [user, register, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
