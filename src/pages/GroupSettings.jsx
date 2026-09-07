import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Save, UserPlus } from 'lucide-react'
import * as storage from '../data/storage.js'
import { useStoreVersion, useStoreReady } from '../hooks/useStore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { fromCents, toCents } from '../utils/money.js'
import AppShell from '../components/AppShell.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import {
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  FormError,
  LoadingState,
  StatusBadge,
  TextButton,
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
        <Avatar name={member.name} src={member.avatarUrl} />
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
  useDocumentTitle(content.pageTitles.groupSettings)
  const { id } = useParams()
  const { user } = useAuth()
  const version = useStoreVersion()
  const ready = useStoreReady()

  const [name, setName] = useState('')
  const [nameSeeded, setNameSeeded] = useState(false)
  const [nameError, setNameError] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetSeeded, setBudgetSeeded] = useState(false)
  const [budgetError, setBudgetError] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState('')

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

  // Same one-time-seed rationale as the name field above.
  useEffect(() => {
    if (data && !budgetSeeded) {
      setBudgetInput(
        data.group.budgetCents != null
          ? String(fromCents(data.group.budgetCents))
          : '',
      )
      setBudgetSeeded(true)
    }
  }, [data, budgetSeeded])

  // Check readiness before trusting a `null` data result — see the same
  // note in GroupDetail.jsx.
  if (!ready) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )
  }
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

  function handleAddMember(event) {
    event.preventDefault()
    const email = storage.normalizeEmail(memberEmail)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMemberError(content.auth.invalidEmailError)
      return
    }
    if (group.members.some((member) => member.email === email)) {
      setMemberError(copy.alreadyMemberError)
      return
    }

    storage.addMember(group.id, email)
    toast.success(copy.addMemberSuccessToast)
    setMemberEmail('')
    setMemberError('')
  }

  function handleBudgetSave(event) {
    event.preventDefault()
    const trimmed = budgetInput.trim()
    if (trimmed === '') {
      storage.updateGroupBudget(group.id, null)
      toast.success(copy.budgetClearedToast)
      setBudgetError('')
      return
    }
    const cents = toCents(trimmed)
    if (!Number.isFinite(cents) || cents <= 0) {
      setBudgetError(copy.budgetInvalidError)
      return
    }
    storage.updateGroupBudget(group.id, cents)
    toast.success(copy.budgetSaveSuccessToast)
    setBudgetError('')
  }

  function handleClearBudget() {
    storage.updateGroupBudget(group.id, null)
    setBudgetInput('')
    setBudgetError('')
    toast.success(copy.budgetClearedToast)
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

      <form
        onSubmit={handleBudgetSave}
        className="mt-8 rounded-card border border-line bg-surface p-5"
      >
        <Field
          label={copy.budgetLabel}
          id="group-settings-budget"
          hint={copy.budgetHint}
          error={budgetError}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-ink-muted">
                $
              </span>
              <TextInput
                id="group-settings-budget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="num pl-7 font-semibold"
                value={budgetInput}
                onChange={(event) => {
                  setBudgetInput(event.target.value)
                  setBudgetError('')
                }}
              />
            </div>
            <Button type="submit" className="shrink-0 gap-2">
              <Save size={16} />
              {copy.save}
            </Button>
          </div>
        </Field>
        {group.budgetCents != null ? (
          <TextButton
            type="button"
            className="mt-3"
            onClick={handleClearBudget}
          >
            {copy.budgetClear}
          </TextButton>
        ) : null}
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">
          {copy.membersHeading}
        </h2>

        <div className="mt-4">
          <Field
            label={copy.addMemberLabel}
            id="group-settings-add-member"
            error={memberError}
            hint={copy.addMemberHint}
          >
            <div className="flex gap-2">
              <TextInput
                id="group-settings-add-member"
                type="email"
                placeholder={copy.addMemberPlaceholder}
                value={memberEmail}
                onChange={(event) => {
                  setMemberEmail(event.target.value)
                  setMemberError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAddMember(event)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddMember}
                className="shrink-0 gap-2"
              >
                <UserPlus size={16} />
                {copy.add}
              </Button>
            </div>
          </Field>
        </div>

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
