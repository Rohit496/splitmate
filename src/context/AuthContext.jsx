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

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Narrows a Supabase auth user down to the {id, name, email, joinedAt,
    avatarUrl} shape the app expects. avatarPath (the raw storage object
    path, vs. avatarUrl's derived public URL) isn't part of the documented
    shape — it's read internally by updatePhoto/removePhoto below to
    best-effort delete the previous object. */
function toPublicUser(authUser) {
  if (!authUser) return null
  const email = storage.normalizeEmail(authUser.email)
  const avatarPath = authUser.user_metadata?.avatar_path || null
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name || storage.nameFromEmail(email),
    email,
    joinedAt: authUser.created_at,
    avatarPath,
    avatarUrl: avatarPath
      ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
      : null,
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

  /**
   * The name lives in two places and both must be written: auth user
   * metadata (what this context and the navbar read) and public.users.name
   * (what every OTHER group member sees in their own member lists) — see
   * specs/profile.md → Edit name. The metadata write is awaited so the
   * caller can react to success/failure honestly; the table write is
   * optimistic-with-rollback, same as every other storage.js mutation.
   */
  const updateName = useCallback(async (name) => {
    const trimmed = String(name ?? '').trim()
    if (!trimmed) return { ok: false, error: copy.nameRequiredError }

    const { error } = await supabase.auth.updateUser({
      data: { name: trimmed },
    })
    if (error) return { ok: false, error: content.profile.nameSaveFailedError }

    storage.updateCurrentUserName(trimmed)
    return { ok: true }
  }, [])

  /**
   * Verifies the current password by re-authenticating before allowing the
   * change — updateUser({ password }) alone doesn't require the old
   * password, so skipping this would let anyone with an unlocked, already-
   * signed-in browser change it without knowing it. Re-auth as the same
   * user just refreshes the session; it doesn't navigate or sign in anyone
   * else.
   */
  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      if (!newPassword || newPassword.length < 6)
        return { ok: false, error: copy.passwordTooShortError }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: currentPassword,
      })
      if (reauthError)
        return {
          ok: false,
          error: content.profile.currentPasswordWrongError,
        }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error)
        return {
          ok: false,
          error: error.message || content.profile.passwordSaveFailedError,
        }

      return { ok: true }
    },
    [user],
  )

  /**
   * Validates type/size, uploads to the per-user folder in the `avatars`
   * bucket, mirrors the path into auth metadata (awaited — this is what
   * drives user.avatarUrl reactively) and public.users.avatar_path (via
   * storage.js), then best-effort deletes the previous object so the bucket
   * doesn't accumulate orphans. A failed delete is logged, not surfaced —
   * the new photo is already live by that point.
   */
  const updatePhoto = useCallback(
    async (file) => {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type))
        return { ok: false, error: content.profile.photoTypeError }
      if (file.size > MAX_PHOTO_BYTES)
        return { ok: false, error: content.profile.photoTooLargeError }

      const ext = file.type.split('/')[1]
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const previousPath = user.avatarPath

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type })
      if (uploadError)
        return { ok: false, error: content.profile.photoUploadFailedError }

      const { error } = await supabase.auth.updateUser({
        data: { avatar_path: path },
      })
      if (error)
        return { ok: false, error: content.profile.photoUploadFailedError }

      storage.updateCurrentUserAvatar(path)

      if (previousPath) {
        supabase.storage
          .from('avatars')
          .remove([previousPath])
          .catch((err) =>
            console.error(
              '[AuthContext] failed to delete previous avatar',
              err,
            ),
          )
      }

      return { ok: true }
    },
    [user],
  )

  /** Trivially reversible (re-upload) — no confirm step, same reasoning the
      app applies to every other non-destructive action. */
  const removePhoto = useCallback(async () => {
    const previousPath = user?.avatarPath

    const { error } = await supabase.auth.updateUser({
      data: { avatar_path: null },
    })
    if (error)
      return { ok: false, error: content.profile.photoUploadFailedError }

    storage.updateCurrentUserAvatar(null)

    if (previousPath) {
      supabase.storage
        .from('avatars')
        .remove([previousPath])
        .catch((err) =>
          console.error('[AuthContext] failed to delete previous avatar', err),
        )
    }

    return { ok: true }
  }, [user])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      register,
      login,
      logout,
      requestPasswordReset,
      updatePassword,
      updateName,
      changePassword,
      updatePhoto,
      removePhoto,
    }),
    [
      user,
      register,
      login,
      logout,
      requestPasswordReset,
      updatePassword,
      updateName,
      changePassword,
      updatePhoto,
      removePhoto,
    ],
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
