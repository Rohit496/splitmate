/**
 * Money is handled in integer cents everywhere it is calculated, and converted
 * back to dollars only for display. Splitting $10 three ways in floating point
 * loses a cent; splitting 1000 cents does not.
 */

export function toCents(amount) {
  return Math.round(Number(amount) * 100)
}

export function fromCents(cents) {
  return cents / 100
}

/**
 * Divides a total into `count` shares that add back up to exactly the total.
 * The leftover cents go to the first few shares, so the caller should pass
 * participants in a stable order to keep results reproducible.
 */
export function splitEqually(totalCents, count) {
  if (count <= 0) return []
  const sign = totalCents < 0 ? -1 : 1
  const total = Math.abs(totalCents)
  const base = Math.floor(total / count)
  const remainder = total - base * count
  return Array.from({ length: count }, (_, index) =>
    sign * (base + (index < remainder ? 1 : 0)),
  )
}

const withDecimals = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const whole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** "$1,800" for round amounts, "$1,800.50" when there are cents. */
export function formatMoney(cents) {
  const value = Math.abs(cents) / 100
  return value % 1 === 0 ? whole.format(value) : withDecimals.format(value)
}

/** Longhand date for expense rows: "12 Mar 2026". */
export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Today as YYYY-MM-DD in the user's own timezone, for date inputs. */
export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}
