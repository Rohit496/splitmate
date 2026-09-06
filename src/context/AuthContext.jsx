import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../data/supabaseClient.js'
import * as storage from '../data/storage.js'
import { content } from '../constant.js'

const copy = content.auth

/**
 * All authentication logic lives here. No other module talks to Supabase Auth
 * or holds a session — they call the functions on this context, exactly as
 * before this moved off localStorage.
 *
 * Supabase Auth owns credentials and the session (persisted to localStorage
 * by the client in data/supabaseClient.js, so it survives closing the
 * browser). `storage.js` still holds groups/expenses; `upsertUserProfile()`
 * keeps its local users list in sync with whoever's actually signed in, so
 * the pending -> active member resolution there keeps working unchanged.
 */

const AuthContext = createContext(null)

/** Narrows a Supabase auth user down to the {id, name, email} shape the app expects. */
function toPublicUser(authUser) {
  if (!authUser) return null
  const email = storage.normalizeEmail(authUser.email)
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name || storage.nameFromEmail(email),
    email,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const publicUser = toPublicUser(session?.user)
      setUser(publicUser)
      if (publicUser) storage.upsertUserProfile(publicUser)
      setInitialized(true)
    })

    // Keeps state in sync across tabs, token refreshes, and sign-out.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const publicUser = toPublicUser(session?.user)
      setUser(publicUser)
      if (publicUser) storage.upsertUserProfile(publicUser)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const register = useCallback(async ({ name, email, password }) => {
    const trimmedName = String(name ?? '').trim()
    const normalizedEmail = storage.normalizeEmail(email)

    if (!trimmedName) return { ok: false, error: copy.nameRequiredError }
    if (!normalizedEmail.includes('@'))
      return { ok: false, error: copy.invalidEmailError }
    if (!password || password.length < 6) {
      return { ok: false, error: copy.passwordTooShortError }
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name: trimmedName } },
    })

    if (error) {
      const alreadyRegistered = /registered|exists/i.test(error.message)
      return {
        ok: false,
        error: alreadyRegistered ? copy.emailTakenError : error.message,
      }
    }
    if (!data.session) {
      // This project requires email confirmation before a session is issued.
      return { ok: false, error: copy.confirmEmailNotice }
    }

    const publicUser = toPublicUser(data.user)
    storage.upsertUserProfile(publicUser)
    return { ok: true, user: publicUser }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const normalizedEmail = storage.normalizeEmail(email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) return { ok: false, error: copy.credentialsMismatchError }

    const publicUser = toPublicUser(data.user)
    storage.upsertUserProfile(publicUser)
    return { ok: true, user: publicUser }
  }, [])

  const logout = useCallback(() => {
    // Clear local state immediately rather than waiting on the network call,
    // so callers that navigate right after logout() (AppShell does) don't
    // race a still-authenticated render against the redirect.
    setUser(null)
    supabase.auth.signOut()
  }, [])

  /**
   * Supabase never reveals whether the email has an account (same
   * anti-enumeration stance as the rest of auth) — this resolves `ok: true`
   * whenever the request itself succeeded, regardless of what's behind it.
   */
  const requestPasswordReset = useCallback(async ({ email }) => {
    const normalizedEmail = storage.normalizeEmail(email)
    if (!normalizedEmail.includes('@'))
      return { ok: false, error: copy.invalidEmailError }

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  /** Only works with the short-lived session the emailed reset link creates. */
  const updatePassword = useCallback(async ({ password }) => {
    if (!password || password.length < 6) {
      return { ok: false, error: copy.passwordTooShortError }
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: copy.resetLinkExpiredError }
    return { ok: true }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      register,
      login,
      logout,
      requestPasswordReset,
      updatePassword,
    }),
    [user, register, login, logout, requestPasswordReset, updatePassword],
  )

  // Hold off rendering until the persisted session (if any) has been read, so
  // RequireAuth never sees a false "logged out" during that initial check.
  if (!initialized) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
