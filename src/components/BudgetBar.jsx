/**
 * A slim progress bar showing spend against an optional group budget.
 * Copy-agnostic — callers pass their own `label` (or omit it for a bare bar),
 * matching BalanceBar's own `label` prop.
 */

const NEAR_THRESHOLD = 0.9

const FILL_TONE = {
  comfortable: 'bg-pos-fg',
  near: 'bg-warn-fg',
  over: 'bg-neg-fg',
}

function toneFor(ratio) {
  if (ratio > 1) return 'over'
  if (ratio >= NEAR_THRESHOLD) return 'near'
  return 'comfortable'
}

export default function BudgetBar({
  spentCents,
  budgetCents,
  size = 'default',
  label,
  className = '',
}) {
  const ratio = budgetCents > 0 ? spentCents / budgetCents : 0
  const tone = toneFor(ratio)
  const widthPct = Math.min(ratio, 1) * 100
  const trackHeight = size === 'compact' ? 'h-1.5' : 'h-2'

  return (
    <div className={className}>
      <div
        className={`w-full overflow-hidden rounded-full bg-line ${trackHeight}`}
      >
        <div
          className={`h-full rounded-full ${FILL_TONE[tone]}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {label ? <p className="mt-1.5 text-xs text-ink-muted">{label}</p> : null}
    </div>
  )
}
