import { content } from '../constant.js'
import { formatMoney } from '../utils/money.js'

/**
 * One settlement, stated from the reader's point of view.
 *
 * Payments the current user is part of are the point of the screen, so they get
 * the full financial colour and the largest figure on the page. Everyone else's
 * debts sit below in stone, present but clearly not the reader's problem.
 */

const TONES = {
  debt: { row: 'border-line bg-neg-bg', text: 'text-neg-fg', amount: 'text-neg-fg' },
  credit: { row: 'border-line bg-pos-bg', text: 'text-pos-fg', amount: 'text-pos-fg' },
  other: { row: 'border-line bg-surface', text: 'text-ink-muted', amount: 'text-flat-fg' },
}

export default function BalanceBar({ from, to, cents, tone = 'other', label, className = '' }) {
  const style = TONES[tone]
  const strong = tone !== 'other'

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-card border px-5 py-4 ${style.row} ${className}`}
    >
      <span className={`min-w-0 text-sm ${strong ? 'font-semibold' : 'font-medium'} ${style.text}`}>
        {label ?? content.groupDetail.othersOweLine(from, to)}
      </span>

      <span
        className={`num shrink-0 font-bold ${style.amount} ${strong ? 'text-xl' : 'text-lg'}`}
      >
        {formatMoney(cents)}
      </span>
    </div>
  )
}
