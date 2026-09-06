import { Link } from 'react-router-dom'
import { content } from '../constant.js'
import { formatMoney } from '../utils/money.js'

/**
 * Shared surfaces and controls.
 *
 * Depth comes from the border and the background contrast — there are no
 * shadows, gradients or glows anywhere in the app. The primary orange is
 * reserved for buttons, focused inputs, links and active states.
 */

/* ------------------------------------------------------------------ cards */

export const cardClass = 'rounded-card border border-line bg-surface p-5'

export function Card({ className = '', as: Tag = 'div', ...props }) {
  return <Tag className={`${cardClass} ${className}`} {...props} />
}

/* ---------------------------------------------------------------- buttons */

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-canvas',
  danger: 'bg-danger text-white hover:bg-danger-hover',
}

export function buttonClass({ variant = 'primary', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center rounded-control px-4 py-2.5',
    'text-sm font-medium transition-colors duration-150',
    'disabled:opacity-50',
    VARIANTS[variant],
    className,
  ].join(' ')
}

export function Button({ variant, className, ...props }) {
  return <button className={buttonClass({ variant, className })} {...props} />
}

export function ButtonLink({ variant, className, ...props }) {
  return <Link className={buttonClass({ variant, className })} {...props} />
}

/** Inline text action — used where a full button would be too heavy. */
export function TextButton({ className = '', tone = 'default', ...props }) {
  const tones = {
    default: 'text-ink-soft hover:text-ink',
    primary: 'text-primary hover:text-primary-hover',
    danger: 'text-danger hover:text-danger-hover',
  }
  return (
    <button
      className={`text-sm font-medium transition-colors ${tones[tone]} ${className}`}
      {...props}
    />
  )
}

/* ----------------------------------------------------------------- inputs */

export const inputClass =
  'w-full rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm text-ink ' +
  'placeholder:text-ink-muted transition-colors ' +
  'focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/12'

export function TextInput({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

export function Field({ label, hint, error, id, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-control bg-neg-bg px-3.5 py-2.5 text-sm text-neg-fg">
      {children}
    </p>
  )
}

/* ----------------------------------------------------------------- badges */

/** Member status. Pending members haven't registered yet. */
export function StatusBadge({ status }) {
  const isPending = status === 'pending'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isPending ? 'bg-warn-bg text-warn-fg' : 'bg-pos-bg text-pos-fg'
      }`}
    >
      {isPending ? content.statusBadge.pending : content.statusBadge.active}
    </span>
  )
}

/** Expense category. Older records saved before this field existed fall back
    to the same default the form starts on. One neutral tone for every
    category — no per-category colour coding. */
export function CategoryTag({ category }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-flat-bg px-2 py-0.5 text-xs font-medium text-flat-fg">
      {category || content.categories.default}
    </span>
  )
}

/* ------------------------------------------------------------------ money */

export const MONEY_TONES = {
  positive: 'text-pos-fg',
  negative: 'text-neg-fg',
  flat: 'text-flat-fg',
  ink: 'text-ink',
}

/** A bare amount. Always tabular so digits line up down a column. */
export function Money({ cents, tone = 'ink', className = '' }) {
  return <span className={`num font-bold ${MONEY_TONES[tone]} ${className}`}>{formatMoney(cents)}</span>
}

/** Balance state on a group card: coloured background, matching text. */
export function BalancePill({ cents }) {
  const settled = cents === 0
  const owed = cents > 0

  const tone = settled
    ? 'bg-flat-bg text-flat-fg'
    : owed
      ? 'bg-pos-bg text-pos-fg'
      : 'bg-neg-bg text-neg-fg'

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${tone}`}
    >
      {settled ? (
        content.balancePill.allSettled
      ) : (
        <>
          {owed ? content.balancePill.youAreOwed : content.balancePill.youOwe}
          <span className="num font-bold">{formatMoney(cents)}</span>
        </>
      )}
    </span>
  )
}

/* ---------------------------------------------------------------- avatars */

/** Initials only — one neutral treatment for everyone, no per-user colour. */
export function Avatar({ name }) {
  const initials = String(name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  return (
    <span
      aria-hidden="true"
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-600"
    >
      {initials || '?'}
    </span>
  )
}

/* ----------------------------------------------------------- empty states */

export function EmptyState({ title, body, children }) {
  return (
    <div className="rounded-card border border-line bg-surface px-5 py-12 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[44ch] text-sm text-ink-muted">{body}</p>
      {children ? <div className="mt-5 flex justify-center">{children}</div> : null}
    </div>
  )
}
