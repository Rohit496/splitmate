import { useEffect, useMemo, useRef, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { content } from '../constant.js'
import { Button, Field, FormError, TextInput, inputClass } from './ui.jsx'
import { formatMoney, splitEqually, toCents, todayISO } from '../utils/money.js'

const copy = content.addExpenseModal

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'

/** Reads a typed amount into cents. Blank counts as zero; anything else unparseable is flagged. */
function parseAmount(raw) {
  const text = String(raw ?? '').trim().replace(/,/g, '')
  if (text === '') return { cents: 0, valid: true }
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return { cents: 0, valid: false }
  return { cents: Math.round(value * 100), valid: true }
}

const asInputValue = (cents) => (cents / 100).toFixed(2)

/**
 * Add expense, layered over the group instead of navigating away — the list you
 * are adding to stays visible behind it.
 *
 * An expense splits equally by default. Switching to exact amounts hands each
 * person their own field and keeps a running tally of what is still unassigned,
 * because the shares have to add up to the total before this can be saved.
 */
export default function AddExpenseModal({ group, currentEmail, onSave, onClose }) {
  const dialogRef = useRef(null)
  const firstFieldRef = useRef(null)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO)
  const [category, setCategory] = useState(content.categories.default)
  const [paidBy, setPaidBy] = useState(currentEmail)
  const [sharedBy, setSharedBy] = useState(() => group.members.map((member) => member.email))
  const [splitMode, setSplitMode] = useState('equal')
  const [manual, setManual] = useState({})
  const [error, setError] = useState('')

  /* Typed amounts survive a trip through equal mode and back, so switching
     modes to look at something never destroys work. */
  const manualStash = useRef(null)

  const totalCents = toCents(amount)
  const hasTotal = Number.isFinite(totalCents) && totalCents > 0

  /** What an equal split would give each selected person right now. */
  const equalShares = useMemo(() => {
    const participants = [...sharedBy].sort()
    if (!hasTotal || participants.length === 0) return new Map()
    const shares = splitEqually(totalCents, participants.length)
    return new Map(participants.map((email, index) => [email, shares[index]]))
  }, [hasTotal, totalCents, sharedBy])

  /** What the typed fields currently come to. Unselected people don't count. */
  const manualShares = useMemo(() => {
    const map = new Map()
    const invalid = []
    for (const email of sharedBy) {
      const { cents, valid } = parseAmount(manual[email])
      if (!valid) invalid.push(email)
      map.set(email, cents)
    }
    return { map, invalid }
  }, [manual, sharedBy])

  const shares = splitMode === 'equal' ? equalShares : manualShares.map
  const assignedCents = [...shares.values()].reduce((sum, cents) => sum + cents, 0)
  const remainderCents = (hasTotal ? totalCents : 0) - assignedCents

  const blanks = sharedBy.filter((email) => String(manual[email] ?? '').trim() === '')
  const canFillBlanks = remainderCents > 0 && blanks.length > 0

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    firstFieldRef.current?.focus()

    return () => {
      document.body.style.overflow = overflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  /* Escape closes; Tab stays inside the dialog. */
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? [])]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function changeMode(next) {
    if (next === splitMode) return

    if (next === 'manual') {
      if (manualStash.current) {
        setManual(manualStash.current)
      } else {
        /* Start from the equal shares so the tally opens already reconciled. */
        const prefilled = {}
        for (const [email, cents] of equalShares) prefilled[email] = asInputValue(cents)
        setManual(prefilled)
      }
    } else {
      manualStash.current = manual
    }

    setSplitMode(next)
    setError('')
  }

  function toggleShare(email) {
    setSharedBy((current) =>
      current.includes(email)
        ? current.filter((candidate) => candidate !== email)
        : [...current, email],
    )
    setError('')
  }

  function setManualAmount(email, value) {
    setManual((current) => ({ ...current, [email]: value }))
    setError('')
  }

  /** Fills the blanks with what's left, or resets everyone to an equal share. */
  function applyHelper() {
    const next = { ...manual }

    if (canFillBlanks) {
      const ordered = [...blanks].sort()
      const parts = splitEqually(remainderCents, ordered.length)
      ordered.forEach((email, index) => {
        next[email] = asInputValue(parts[index])
      })
    } else {
      for (const [email, cents] of equalShares) next[email] = asInputValue(cents)
    }

    setManual(next)
    setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!description.trim()) {
      setError(copy.descriptionRequiredError)
      return
    }
    if (!hasTotal) {
      setError(copy.amountRequiredError)
      return
    }
    if (sharedBy.length === 0) {
      setError(copy.noOneSelectedError)
      return
    }

    if (splitMode === 'manual') {
      if (manualShares.invalid.length > 0) {
        setError(copy.invalidShareError)
        return
      }
      if (remainderCents > 0) {
        setError(copy.remainderPositiveError(formatMoney(remainderCents)))
        return
      }
      if (remainderCents < 0) {
        setError(copy.remainderNegativeError(formatMoney(-remainderCents)))
        return
      }
    }

    onSave({
      description: description.trim(),
      amount: Number(amount),
      date,
      category,
      paidBy,
      participants: sharedBy,
      splitMode,
      splits: [...shares].map(([email, cents]) => ({ email, amountCents: cents })),
    })
  }

  const allSelected = sharedBy.length === group.members.length

  let tally = copy.splitEqual
  if (splitMode === 'equal') {
    if (sharedBy.length > 0) {
      tally = copy.tallyEqual(sharedBy.length)
    }
  } else if (!hasTotal) {
    tally = copy.tallyNeedTotal
  } else if (remainderCents > 0) {
    tally = copy.tallyRemaining(formatMoney(remainderCents))
  } else if (remainderCents < 0) {
    tally = copy.tallyOver(formatMoney(-remainderCents))
  } else {
    tally = copy.tallyAllAssigned(formatMoney(totalCents))
  }

  const tallyOff = splitMode === 'manual' && hasTotal && remainderCents !== 0

  const SPLIT_MODES = [
    ['equal', copy.splitEqual],
    ['manual', copy.splitManual],
  ]

  return (
    <div
      className="veil-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        onKeyDown={handleKeyDown}
        className="sheet-in flex max-h-[92vh] w-full max-w-[480px] flex-col rounded-t-modal bg-surface p-6 sm:rounded-modal"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
          <h2 id="add-expense-title" className="text-lg font-semibold text-ink">
            {copy.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="-mr-1 rounded-control px-2 py-1 text-lg leading-none text-ink-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            <div className="flex flex-col gap-4">
              <Field label={copy.descriptionLabel} id="expense-description">
                <TextInput
                  id="expense-description"
                  ref={firstFieldRef}
                  placeholder={copy.descriptionPlaceholder}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                    setError('')
                  }}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.amountLabel} id="expense-amount">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-ink-muted">
                      $
                    </span>
                    <TextInput
                      id="expense-amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="num pl-7 font-semibold"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value)
                        setError('')
                      }}
                    />
                  </div>
                </Field>

                <Field label={copy.dateLabel} id="expense-date">
                  <TextInput
                    id="expense-date"
                    type="date"
                    className="num"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </Field>
              </div>

              <Field label={copy.payerLabel} id="expense-payer">
                <select
                  id="expense-payer"
                  className={inputClass}
                  value={paidBy}
                  onChange={(event) => setPaidBy(event.target.value)}
                >
                  {group.members.map((member) => (
                    <option key={member.email} value={member.email}>
                      {member.email === currentEmail ? copy.youSuffix(member.name) : member.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={content.categories.label} id="expense-category">
                <select
                  id="expense-category"
                  className={inputClass}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {content.categories.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">{copy.splitLabel}</p>
                <div className="flex rounded-control border border-line p-0.5">
                  {SPLIT_MODES.map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => changeMode(mode)}
                      aria-pressed={splitMode === mode}
                      className={`flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors ${
                        splitMode === mode
                          ? 'bg-primary text-white'
                          : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="border-0 p-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <legend className="text-sm font-medium text-ink">{copy.sharesLabel}</legend>
                  <button
                    type="button"
                    onClick={() =>
                      setSharedBy(allSelected ? [] : group.members.map((member) => member.email))
                    }
                    className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                  >
                    {allSelected ? copy.clearAll : copy.selectEveryone}
                  </button>
                </div>

                <div className="overflow-hidden rounded-control border border-line">
                  {group.members.map((member, index) => {
                    const checked = sharedBy.includes(member.email)
                    const cents = shares.get(member.email)

                    return (
                      <div
                        key={member.email}
                        className={`flex items-center gap-3 bg-surface px-3.5 py-2.5 ${
                          index > 0 ? 'border-t border-line' : ''
                        }`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-primary"
                            checked={checked}
                            onChange={() => toggleShare(member.email)}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">
                            {member.name}
                            {member.email === currentEmail ? (
                              <span className="ml-1.5 text-xs text-ink-muted">{copy.you}</span>
                            ) : null}
                          </span>
                        </label>

                        {splitMode === 'equal' ? (
                          <span
                            className={`num shrink-0 text-sm font-bold ${
                              checked && hasTotal ? 'text-ink' : 'text-ink-muted'
                            }`}
                          >
                            {checked && hasTotal ? formatMoney(cents ?? 0) : '—'}
                          </span>
                        ) : (
                          <div className="relative w-28 shrink-0">
                            <span
                              className={`pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm ${
                                checked ? 'text-ink-muted' : 'text-line'
                              }`}
                            >
                              $
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              aria-label={copy.amountForAria(member.name)}
                              disabled={!checked}
                              value={manual[member.email] ?? ''}
                              onChange={(event) =>
                                setManualAmount(member.email, event.target.value)
                              }
                              className="num w-full rounded-control border border-line bg-surface py-1.5 pl-6 pr-2 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/12 disabled:bg-canvas disabled:text-ink-muted"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {splitMode === 'manual' && hasTotal && remainderCents !== 0 ? (
                  <button
                    type="button"
                    onClick={applyHelper}
                    className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                  >
                    {canFillBlanks ? copy.splitRestEqually : copy.resetToEqualShares}
                  </button>
                ) : null}
              </fieldset>

              <FormError>{error}</FormError>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className={`text-xs ${tallyOff ? 'font-medium text-neg-fg' : 'text-ink-muted'}`}>
              {tally}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                {copy.cancel}
              </Button>
              <Button type="submit" className="gap-2">
                <PlusCircle size={16} />
                {copy.save}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
