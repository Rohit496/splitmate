import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Lock, Save, KeyRound } from 'lucide-react'
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
 */
export default function Profile() {
  useDocumentTitle(content.pageTitles.profile)
  const { user, updateName, changePassword, updatePhoto, removePhoto } =
    useAuth()

  /* --------------------------------------------------------------- name */

  const [name, setName] = useState('')
  const [nameSeeded, setNameSeeded] = useState(false)
  const [nameError, setNameError] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Seed once, same pattern GroupSettings uses for its rename field — so a
  // reactive re-render from an auth event (this save's own USER_UPDATED, a
  // token refresh) never clobbers whatever's mid-edit.
  useEffect(() => {
    if (!nameSeeded) {
      setName(user.name)
      setNameSeeded(true)
    }
  }, [user, nameSeeded])

  async function handleRename(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setNameError(copy.nameRequiredError)
    if (trimmed.length > 60) return setNameError(copy.nameTooLongError)

    setSavingName(true)
    const result = await updateName(trimmed)
    setSavingName(false)
    if (!result.ok) return setNameError(result.error)

    toast.success(copy.nameSavedToast)
    setNameError('')
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

        {/* Your details */}
        <div className="mt-8 rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">
            {copy.detailsHeading}
          </h2>

          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" />

            <div className="flex w-full flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  {copy.emailLabel}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink">
                  {user.email}
                  <Lock
                    size={12}
                    className="text-ink-muted"
                    aria-hidden="true"
                  />
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {copy.emailReadonlyHint}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-ink-muted">
                  {copy.joinedLabel}
                </p>
                <p className="mt-0.5 text-sm text-ink">
                  {formatDate(user.joinedAt.slice(0, 10))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Real, focusable input — visually hidden, triggered via the
                button below by ref so keyboard/screen-reader users can still
                reach it directly. Never faked with a styled div. */}
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

          {photoError ? (
            <div className="mt-3">
              <FormError>{photoError}</FormError>
            </div>
          ) : null}
        </div>

        {/* Name */}
        <form
          onSubmit={handleRename}
          className="mt-8 rounded-card border border-line bg-surface p-5"
        >
          <h2 className="text-lg font-semibold text-ink">{copy.nameHeading}</h2>
          <div className="mt-4">
            <Field label={copy.nameLabel} id="profile-name" error={nameError}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  id="profile-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setNameError('')
                  }}
                />
                <Button
                  type="submit"
                  disabled={savingName}
                  className="shrink-0 gap-2"
                >
                  <Save size={16} aria-hidden="true" />
                  {copy.save}
                </Button>
              </div>
            </Field>
          </div>
        </form>

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
