import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Save } from 'lucide-react'
import * as storage from '../data/storage.js'
import { useStoreVersion } from '../hooks/useStore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AppShell from '../components/AppShell.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import {
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  FormError,
  StatusBadge,
  TextInput,
} from '../components/ui.jsx'

const copy = content.groupSettings
const detailCopy = content.groupDetail

function NotFound() {
  return (
    <AppShell>
      <EmptyState
        title={detailCopy.notFoundTitle}
        body={detailCopy.notFoundBody}
      >
        <ButtonLink to="/dashboard" variant="secondary">
          {detailCopy.backToGroups}
        </ButtonLink>
      </EmptyState>
    </AppShell>
  )
}

function MemberRow({ member, isYou, onRemove }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  function handleConfirm() {
    try {
      onRemove(member.email)
      setConfirming(false)
      setError('')
    } catch (err) {
      setConfirming(false)
      setError(err.message)
    }
  }

  return (
    <li className="border-t border-line px-5 py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">
            {member.name}
            {isYou ? (
              <span className="ml-1.5 text-xs text-ink-muted">{copy.you}</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-ink-muted">{member.email}</p>
        </div>
        <StatusBadge status={member.status} />
        {member.isCreator ? (
          <span className="shrink-0 text-xs font-medium text-ink-muted">
            {copy.creatorTag}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={copy.removeAria(member.name)}
            className="shrink-0 rounded-control px-1.5 py-1 text-sm text-ink-muted transition-colors hover:text-danger"
          >
            {copy.remove}
          </button>
        )}
      </div>

      {error ? (
        <div className="mt-2">
          <FormError>{error}</FormError>
        </div>
      ) : null}

      {confirming ? (
        <ConfirmModal
          title={copy.removeConfirmTitle(member.name)}
          body={copy.removeConfirmBody(member.name)}
          confirmLabel={copy.removeConfirmLabel}
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </li>
  )
}

export default function GroupSettings() {
  const { id } = useParams()
  const { user } = useAuth()
  const version = useStoreVersion()

  const [name, setName] = useState('')
  const [nameSeeded, setNameSeeded] = useState(false)
  const [nameError, setNameError] = useState('')

  const data = useMemo(() => {
    const group = storage.getGroup(id)
    if (!group) return null
    const membership = group.members.find(
      (member) => member.email === user.email,
    )
    if (!membership) return null
    return { group, isCreator: membership.isCreator }
  }, [id, user.email, version])

  // Seed the name field from the group once, so a later write elsewhere
  // (another tab, a rollback) doesn't clobber whatever's mid-edit here.
  useEffect(() => {
    if (data && !nameSeeded) {
      setName(data.group.name)
      setNameSeeded(true)
    }
  }, [data, nameSeeded])

  if (!data) return <NotFound />
  if (!data.isCreator) return <Navigate to={`/group/${id}`} replace />

  const { group } = data

  function handleRename(event) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError(copy.nameRequiredError)
      return
    }
    storage.renameGroup(group.id, name)
    toast.success(copy.renameSuccessToast)
    setNameError('')
  }

  function handleRemoveMember(email) {
    storage.removeMember(group.id, email)
    toast.success(copy.removeSuccessToast)
  }

  return (
    <AppShell>
      <Link
        to={`/group/${group.id}`}
        className="text-sm text-ink-soft transition-colors hover:text-ink"
      >
        {copy.back}
      </Link>

      <h1 className="mt-4 text-xl font-bold text-ink">{copy.heading}</h1>

      <form
        onSubmit={handleRename}
        className="mt-8 rounded-card border border-line bg-surface p-5"
      >
        <Field
          label={copy.nameLabel}
          id="group-settings-name"
          error={nameError}
        >
          <div className="flex gap-2">
            <TextInput
              id="group-settings-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
              }}
            />
            <Button type="submit" className="shrink-0 gap-2">
              <Save size={16} />
              {copy.save}
            </Button>
          </div>
        </Field>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">
          {copy.membersHeading}
        </h2>
        <ul className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
          {group.members.map((member) => (
            <MemberRow
              key={member.email}
              member={member}
              isYou={member.email === user.email}
              onRemove={handleRemoveMember}
            />
          ))}
        </ul>
      </section>
    </AppShell>
  )
}
