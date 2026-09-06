import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Plus, UserPlus } from 'lucide-react'
import * as storage from '../data/storage.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AppShell from '../components/AppShell.jsx'
import {
  Avatar,
  Button,
  Field,
  FormError,
  StatusBadge,
  TextInput,
} from '../components/ui.jsx'

const copy = content.createGroup

/** Resolves an email to the person it belongs to, or to a pending invitee. */
function describe(email) {
  const account = storage.getUserByEmail(email)
  return {
    email,
    name: account ? account.name : storage.nameFromEmail(email),
    status: account ? 'active' : 'pending',
  }
}

export default function CreateGroup() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [invited, setInvited] = useState([])
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')

  const members = useMemo(
    () => [{ ...describe(user.email), isYou: true }, ...invited.map((email) => describe(email))],
    [user.email, invited],
  )

  function addMember(event) {
    event.preventDefault()
    const email = storage.normalizeEmail(emailDraft)

    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(copy.invalidEmailError)
      return
    }
    if (email === user.email) {
      setEmailError(copy.alreadyInGroupError)
      return
    }
    if (invited.includes(email)) {
      setEmailError(copy.alreadyInvitedError)
      return
    }

    setInvited((current) => [...current, email])
    setEmailDraft('')
    setEmailError('')
    setFormError('')
  }

  function removeMember(email) {
    setInvited((current) => current.filter((candidate) => candidate !== email))
  }

  function createGroup(event) {
    event.preventDefault()
    if (!name.trim()) {
      setFormError(copy.nameRequiredError)
      return
    }

    const group = storage.createGroup({
      name,
      creatorEmail: user.email,
      memberEmails: invited,
    })
    toast.success(copy.successToast)
    navigate(`/group/${group.id}`, { replace: true })
  }

  const pendingCount = members.filter((member) => member.status === 'pending').length

  return (
    <AppShell>
      <Link to="/dashboard" className="text-sm text-ink-soft transition-colors hover:text-ink">
        {copy.back}
      </Link>

      <h1 className="mt-4 text-xl font-bold text-ink">{copy.heading}</h1>
      <p className="mt-1 text-sm text-ink-soft">{copy.intro}</p>

      <form onSubmit={createGroup} className="mt-8 rounded-card border border-line bg-surface p-5">
        <Field label={copy.groupNameLabel} id="group-name">
          <TextInput
            id="group-name"
            placeholder={copy.groupNamePlaceholder}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setFormError('')
            }}
            autoFocus
          />
        </Field>

        <div className="mt-5 border-t border-line pt-5">
          <Field
            label={copy.membersLabel}
            id="member-email"
            error={emailError}
            hint={copy.membersHint}
          >
            <div className="flex gap-2">
              <TextInput
                id="member-email"
                type="email"
                placeholder={copy.memberPlaceholder}
                value={emailDraft}
                onChange={(event) => {
                  setEmailDraft(event.target.value)
                  setEmailError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addMember(event)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addMember}
                className="shrink-0 gap-2"
              >
                <UserPlus size={16} />
                {copy.add}
              </Button>
            </div>
          </Field>
        </div>

        <ul className="mt-4 overflow-hidden rounded-control border border-line">
          {members.map((member, index) => (
            <li
              key={member.email}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${
                index > 0 ? 'border-t border-line' : ''
              }`}
            >
              <Avatar name={member.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  {member.name}
                  {member.isYou ? <span className="ml-1.5 text-xs text-ink-muted">{copy.you}</span> : null}
                </p>
                <p className="truncate text-xs text-ink-muted">{member.email}</p>
              </div>
              <StatusBadge status={member.status} />
              {member.isYou ? null : (
                <button
                  type="button"
                  onClick={() => removeMember(member.email)}
                  aria-label={copy.removeAria(member.name)}
                  className="rounded-control px-1.5 py-1 text-xs text-ink-muted transition-colors hover:text-danger"
                >
                  {copy.remove}
                </button>
              )}
            </li>
          ))}
        </ul>

        {pendingCount > 0 ? (
          <p className="mt-3 text-xs text-ink-muted">{copy.pendingNotice(pendingCount)}</p>
        ) : null}

        <div className="mt-4">
          <FormError>{formError}</FormError>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
          <Button type="submit" className="gap-2">
            <Plus size={16} />
            {copy.submit}
          </Button>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            {copy.cancel}
          </Link>
        </div>
      </form>
    </AppShell>
  )
}
