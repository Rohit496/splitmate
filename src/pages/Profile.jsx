import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Save, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { formatDate } from '../utils/money.js'
import AppShell from '../components/AppShell.jsx'
import {
  Avatar,
  Button,
  Field,
  FormError,
  TextButton,
  TextInput,
} from '../components/ui.jsx'

const copy = content.profile

/**
 * The account-settings counterpart to GroupSettings, scoped to the one
 * signed-in user instead of a group. RequireAuth guarantees a session and
 * AuthProvider holds off rendering until it's read, so `user` is always
 * non-null here — no loading/null-guard state needed. See specs/profile.md.
 *
 * Photo, email, name and mobile all live in one "Personal details" card
 * with a single Save button — email/name/mobile share one form and one
 * submit handler (each field only writes if it actually changed, so
 * editing just your name doesn't also fire an email-change request).
 * Photo keeps its own immediate Change/Remove actions rather than
 * deferring to that Save, since a file picker doesn't work that way.
 * Change password stays a separate card — its save flow (re-authenticating
 * with the current password first) is fundamentally different.
 */
export default function Profile() {
  useDocumentTitle(content.pageTitles.profile)
  const {
    user,
    updateName,
    updateEmail,
    updateMobile,
    changePassword,
    updatePhoto,
    removePhoto,
  } = useAuth()

  /* ------------------------------------------------------- personal info */

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobile, setMobile] = useState('')
  const [detailsSeeded, setDetailsSeeded] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  // Seed once, same pattern GroupSettings uses for its rename field — so a
  // reactive re-render from an auth event (this save's own USER_UPDATED, a
  // token refresh) never clobbers whatever's mid-edit. user.name is still a
  // single string end to end (storage/auth metadata/every other page that
  // reads it) — split on the first space purely for this editing UI, and
  // rejoined on save.
  useEffect(() => {
    if (!detailsSeeded) {
      const [first, ...rest] = user.name.trim().split(/\s+/)
      setFirstName(first || '')
      setLastName(rest.join(' '))
      setEmail(user.email)
      setMobile(user.mobile)
      setDetailsSeeded(true)
    }
  }, [user, detailsSeeded])

  async function handleDetailsSave(event) {
    event.preventDefault()
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const combinedName = [trimmedFirst, trimmedLast].filter(Boolean).join(' ')
    const trimmedEmail = email.trim()
    const trimmedMobile = mobile.trim()

    if (!trimmedFirst) return setDetailsError(copy.firstNameRequiredError)
    if (combinedName.length > 60) return setDetailsError(copy.nameTooLongError)
    if (!trimmedEmail) return setDetailsError(content.auth.invalidEmailError)

    setSavingDetails(true)

    if (combinedName !== user.name) {
      const result = await updateName(combinedName)
      if (!result.ok) {
        setSavingDetails(false)
        return setDetailsError(result.error)
      }
    }

    if (trimmedMobile !== (user.mobile || '')) {
      const result = await updateMobile(trimmedMobile)
      if (!result.ok) {
        setSavingDetails(false)
        return setDetailsError(result.error)
      }
    }

    let emailChangeRequested = false
    if (trimmedEmail !== user.email) {
      const result = await updateEmail(trimmedEmail)
      if (!result.ok) {
        setSavingDetails(false)
        return setDetailsError(result.error)
      }
      emailChangeRequested = true
    }

    setSavingDetails(false)
    setDetailsError('')

    if (combinedName !== user.name || trimmedMobile !== (user.mobile || '')) {
      toast.success(copy.detailsSavedToast)
    }
    if (emailChangeRequested) {
      toast.success(copy.emailChangeRequestedToast)
    }
  }

  /* ----------------------------------------------------------- password */

  const [current, setCurrent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleChangePassword(event) {
    event.preventDefault()
    if (!current) return setPasswordError(copy.currentPasswordRequiredError)
    if (newPassword.length < 6)
      return setPasswordError(content.auth.passwordTooShortError)
    if (newPassword !== confirm) return setPasswordError(copy.mismatchError)
    if (newPassword === current) return setPasswordError(copy.samePasswordError)

    setSavingPassword(true)
    const result = await changePassword({
      currentPassword: current,
      newPassword,
    })
    setSavingPassword(false)
    if (!result.ok) return setPasswordError(result.error)

    toast.success(copy.passwordSavedToast)
    setCurrent('')
    setNewPassword('')
    setConfirm('')
    setPasswordError('')
  }

  /* -------------------------------------------------------------- photo */

  const fileInputRef = useRef(null)
  const [photoError, setPhotoError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be re-selected later
    if (!file) return

    setPhotoBusy(true)
    const result = await updatePhoto(file)
    setPhotoBusy(false)
    if (!result.ok) return setPhotoError(result.error)

    toast.success(copy.photoUpdatedToast)
    setPhotoError('')
  }

  async function handleRemovePhoto() {
    setPhotoBusy(true)
    const result = await removePhoto()
    setPhotoBusy(false)
    if (!result.ok) return setPhotoError(result.error)

    toast.success(copy.photoRemovedToast)
    setPhotoError('')
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-ink">{copy.heading}</h1>
        <p className="mt-1 text-sm text-ink-soft">{copy.intro}</p>

        {/* Personal details */}
        <div className="mt-8 rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">
            {copy.detailsHeading}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {copy.joinedLabel} {formatDate(user.joinedAt.slice(0, 10))}
          </p>

          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" />

            <div className="flex flex-wrap items-center gap-3">
              {/* Real, focusable input — visually hidden, triggered via the
                  button below by ref so keyboard/screen-reader users can
                  still reach it directly. Never faked with a styled div. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={copy.changePhoto}
                className="sr-only"
                onChange={handlePhotoSelected}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={photoBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {copy.changePhoto}
              </Button>
              {user.avatarUrl ? (
                <TextButton
                  type="button"
                  disabled={photoBusy}
                  onClick={handleRemovePhoto}
                >
                  {copy.removePhoto}
                </TextButton>
              ) : null}
            </div>
          </div>

          {photoError ? (
            <div className="mt-3">
              <FormError>{photoError}</FormError>
            </div>
          ) : null}

          <form
            onSubmit={handleDetailsSave}
            className="mt-6 flex flex-col gap-4 border-t border-line pt-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Field label={copy.firstNameLabel} id="profile-first-name">
                  <TextInput
                    id="profile-first-name"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value)
                      setDetailsError('')
                    }}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label={copy.lastNameLabel} id="profile-last-name">
                  <TextInput
                    id="profile-last-name"
                    value={lastName}
                    onChange={(event) => {
                      setLastName(event.target.value)
                      setDetailsError('')
                    }}
                  />
                </Field>
              </div>
            </div>

            <Field
              label={copy.emailLabel}
              id="profile-email"
              hint={copy.emailChangeHint}
            >
              <TextInput
                id="profile-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setDetailsError('')
                }}
              />
            </Field>

            <Field
              label={copy.mobileLabel}
              id="profile-mobile"
              hint={copy.mobileHint}
            >
              <TextInput
                id="profile-mobile"
                type="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(event) => {
                  setMobile(event.target.value)
                  setDetailsError('')
                }}
              />
            </Field>

            <FormError>{detailsError}</FormError>

            <Button
              type="submit"
              disabled={savingDetails}
              className="gap-2 self-start"
            >
              <Save size={16} aria-hidden="true" />
              {copy.save}
            </Button>
          </form>
        </div>

        {/* Change password */}
        <form
          onSubmit={handleChangePassword}
          className="mt-8 rounded-card border border-line bg-surface p-5"
        >
          <h2 className="text-lg font-semibold text-ink">
            {copy.passwordHeading}
          </h2>
          {/* Hidden but real — lets password managers correctly associate
              the new password with this account (Chrome/most browsers warn
              on password forms with no username field at all). */}
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={user.email}
            readOnly
            hidden
          />
          <div className="mt-4 flex flex-col gap-4">
            <Field label={copy.currentPasswordLabel} id="profile-current">
              <TextInput
                id="profile-current"
                type="password"
                autoComplete="current-password"
                placeholder={copy.passwordPlaceholder}
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value)
                  setPasswordError('')
                }}
              />
            </Field>

            <Field
              label={copy.newPasswordLabel}
              id="profile-new"
              hint={copy.passwordHint}
            >
              <TextInput
                id="profile-new"
                type="password"
                autoComplete="new-password"
                placeholder={copy.passwordPlaceholder}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setPasswordError('')
                }}
              />
            </Field>

            <Field label={copy.confirmPasswordLabel} id="profile-confirm">
              <TextInput
                id="profile-confirm"
                type="password"
                autoComplete="new-password"
                placeholder={copy.passwordPlaceholder}
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value)
                  setPasswordError('')
                }}
              />
            </Field>

            <FormError>{passwordError}</FormError>

            <Button
              type="submit"
              disabled={savingPassword}
              className="w-full gap-2"
            >
              <KeyRound size={16} aria-hidden="true" />
              {copy.updatePassword}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
