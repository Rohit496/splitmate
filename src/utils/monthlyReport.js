/**
 * Aggregates a signed-in user's expense history across every group they
 * belong to into the shapes the Reports page needs: a filtered, resolved
 * row list, three summary totals, a spending-over-time chart, and a
 * by-category breakdown.
 *
 * Reads exclusively through `data/storage.js` — no direct Supabase access
 * here, the same boundary `utils/groupExport.js` already follows. Nothing
 * here is stored: everything is recomputed from the live cache on every
 * call, same philosophy as `utils/balances.js` ("nothing is ever stored...
 * recomputed every time it's read").
 *
 * This is spend, not balance: unlike `utils/balances.js`, nothing here is
 * ever netted against what another member owes you. "Your share" is simply
 * your own slice of each expense.
 */

import * as storage from '../data/storage.js'
import { expenseShares } from './balances.js'
import { toCents, todayISO } from './money.js'
import { content } from '../constant.js'

export const DEFAULT_FILTERS = {
  dateRange: 'all',
  customFrom: '',
  customTo: '',
  groupId: 'all',
  category: 'all',
}

/* ------------------------------------------------------------- date math */

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** `month` is 0-based, matching `Date`'s own convention. */
function isoOf(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

function parseISO(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  return { year, month: month - 1, day }
}

function startOfMonth(isoDate) {
  const { year, month } = parseISO(isoDate)
  return isoOf(year, month, 1)
}

/**
 * `isoDate` minus `months` calendar months, with the day clamped to the
 * target month's last day rather than overflowing into the month after (so
 * "3 months before Mar 31" lands on Dec 31, not rolling into January).
 */
function subtractMonths(isoDate, months) {
  const { year, month, day } = parseISO(isoDate)
  const targetIndex = year * 12 + month - months
  const targetYear = Math.floor(targetIndex / 12)
  const targetMonth = ((targetIndex % 12) + 12) % 12
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  return isoOf(targetYear, targetMonth, Math.min(day, daysInTargetMonth))
}

/**
 * True when a custom range's `From` is after its `To` — the one input this
 * page can't just clamp silently, since both ends came from the person
 * looking at the report.
 */
export function isCustomRangeInvalid(filters) {
  return Boolean(
    filters.dateRange === 'custom' &&
    filters.customFrom &&
    filters.customTo &&
    filters.customFrom > filters.customTo,
  )
}

/**
 * Resolves a filter's `dateRange` preset into an inclusive `{ from, to }`
 * bound on `expense.date` (both `YYYY-MM-DD` strings, or `null` for an
 * unbounded side). Presets are rolling windows ending today — "Last 3
 * months" checked on Sep 7 covers Jun 7 through Sep 7, not the 3 prior
 * *calendar* months.
 *
 * An invalid custom range (`From` after `To`) resolves to unbounded rather
 * than to a range that would silently match nothing — the page shows an
 * inline error for that case instead (see `isCustomRangeInvalid`).
 */
export function resolveDateRange(filters) {
  const today = todayISO()
  switch (filters.dateRange) {
    case 'thisMonth':
      return { from: startOfMonth(today), to: today }
    case 'last3Months':
      return { from: subtractMonths(today, 3), to: today }
    case 'last12Months':
      return { from: subtractMonths(today, 12), to: today }
    case 'custom':
      if (isCustomRangeInvalid(filters)) return { from: null, to: null }
      return { from: filters.customFrom || null, to: filters.customTo || null }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

/* ------------------------------------------------------------- bucketing */

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

/** `monthIndex` is 0-based; quarters are 1-based for display ("Q1"). */
function quarterOf(monthIndex) {
  return Math.floor(monthIndex / 3) + 1
}

/** One calendar bucket at the given granularity, keyed by its start month. */
function bucketFromMonthIndex(monthIndex, granularity) {
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12

  if (granularity === 'year') {
    return { key: `${year}`, label: `${year}` }
  }
  if (granularity === 'quarter') {
    const q = quarterOf(month)
    return { key: `${year}-Q${q}`, label: `Q${q} ${year}` }
  }
  return {
    key: `${year}-${pad2(month + 1)}`,
    label: MONTH_LABEL.format(new Date(year, month, 1)),
  }
}

function monthIndexOf(isoDate, granularity) {
  const { year, month } = parseISO(isoDate)
  const raw = year * 12 + month
  if (granularity === 'year') return Math.floor(raw / 12) * 12
  if (granularity === 'quarter') return Math.floor(raw / 3) * 3
  return raw
}

/**
 * Bucket granularity from the span the *included* expenses actually cover
 * (after filtering), not from the selected date-range filter itself — so
 * picking "All time" on an account with three months of history still
 * charts by month, not by year.
 *
 * Month while the span is readable as monthly bars (<=24), quarter while
 * it's still readable as quarterly bars (<=8 years), year beyond that.
 */
function granularityFor(rows) {
  if (rows.length === 0) return 'month'
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    const { year, month } = parseISO(row.date)
    const index = year * 12 + month
    if (index < min) min = index
    if (index > max) max = index
  }
  const monthSpan = max - min + 1
  if (monthSpan <= 24) return 'month'
  return Math.ceil(monthSpan / 12) <= 8 ? 'quarter' : 'year'
}

/**
 * With no rows to derive a range from (nothing recorded yet, or the current
 * filters just don't match anything), there's no earliest/latest expense to
 * bucket between — fall back to the trailing 6 calendar months ending this
 * month, all at $0, so the chart still has its familiar shape instead of
 * disappearing. Same "a quiet month still shows as a $0 bar" reasoning as
 * `buildChartBuckets` below, just with the whole range quiet.
 */
function emptyTrailingBuckets(months = 6) {
  const currentIndex = monthIndexOf(todayISO(), 'month')
  const buckets = []
  for (let offset = months - 1; offset >= 0; offset--) {
    buckets.push({
      ...bucketFromMonthIndex(currentIndex - offset, 'month'),
      cents: 0,
    })
  }
  return buckets
}

/**
 * Every bucket between the earliest and latest included expense, inclusive,
 * even ones with zero spend — a quiet month should show as a $0 bar, not
 * vanish from the timeline, same reasoning a bank statement doesn't skip a
 * month you spent nothing.
 */
function buildChartBuckets(rows, granularity) {
  if (rows.length === 0) return emptyTrailingBuckets()

  const step = granularity === 'year' ? 12 : granularity === 'quarter' ? 3 : 1
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    const index = monthIndexOf(row.date, granularity)
    if (index < min) min = index
    if (index > max) max = index
  }

  const buckets = []
  const totalsByKey = new Map()
  for (let index = min; index <= max; index += step) {
    const bucket = bucketFromMonthIndex(index, granularity)
    buckets.push({ ...bucket, cents: 0 })
    totalsByKey.set(bucket.key, buckets[buckets.length - 1])
  }

  for (const row of rows) {
    const index = monthIndexOf(row.date, granularity)
    const bucket = bucketFromMonthIndex(index, granularity)
    const target = totalsByKey.get(bucket.key)
    if (target) target.cents += row.yourShareCents ?? 0
  }

  return buckets
}

/* --------------------------------------------------------------- helpers */

function resolveName(email, nameOf) {
  return nameOf.get(email) ?? email
}

/* ----------------------------------------------------------------- build */

/**
 * @param {{ userEmail: string, filters: object }} args
 * @returns {{
 *   rows: Array<object>,           // newest first, resolved and filtered
 *   totalSpentCents: number,       // full amount of every included expense
 *   yourShareCents: number,        // sum of just your split of each
 *   expenseCount: number,
 *   chartBuckets: Array<{ key, label, cents }>,  // oldest first
 *   categoryBreakdown: Array<{ category, cents, percent }>,  // desc by cents
 * }}
 */
export function buildMonthlyReport({ userEmail, filters }) {
  const { from, to } = resolveDateRange(filters)
  const groups = storage.listGroupsForEmail(userEmail)

  const rows = []
  for (const group of groups) {
    if (filters.groupId !== 'all' && filters.groupId !== group.id) continue

    const nameOf = new Map(
      group.members.map((member) => [member.email, member.name]),
    )

    for (const expense of storage.listExpenses(group.id)) {
      if (from && expense.date < from) continue
      if (to && expense.date > to) continue

      // Same fallback CategoryTag already applies for expenses saved before
      // the field existed — they still land under "Other" here too.
      const category = expense.category || content.categories.default
      if (filters.category !== 'all' && filters.category !== category) continue

      const share = expenseShares(expense).find((s) => s.email === userEmail)

      rows.push({
        id: expense.id,
        date: expense.date,
        createdAt: expense.createdAt,
        groupId: group.id,
        groupName: group.name,
        description: expense.description,
        category,
        amountCents: toCents(expense.amount),
        // null, not 0 — an expense you weren't a participant in isn't a
        // zero share, there's no share to report at all.
        yourShareCents: share ? share.cents : null,
        paidByEmail: expense.paidBy,
        paidByName: resolveName(expense.paidBy, nameOf),
        participantEmails: expense.participants,
        participantNames: expense.participants.map((email) =>
          resolveName(email, nameOf),
        ),
      })
    }
  }

  // Newest first, matching every other on-screen expense list (GroupDetail's
  // included) — the CSV util re-sorts oldest-first itself for its own file.
  rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )

  const totalSpentCents = rows.reduce((sum, row) => sum + row.amountCents, 0)
  const yourShareCents = rows.reduce(
    (sum, row) => sum + (row.yourShareCents ?? 0),
    0,
  )

  const categoryTotals = new Map()
  for (const row of rows) {
    categoryTotals.set(
      row.category,
      (categoryTotals.get(row.category) ?? 0) + row.amountCents,
    )
  }
  const categoryBreakdown = [...categoryTotals.entries()]
    .map(([category, cents]) => ({
      category,
      cents,
      percent:
        totalSpentCents > 0 ? Math.round((cents / totalSpentCents) * 100) : 0,
    }))
    .sort((a, b) => b.cents - a.cents)

  const granularity = granularityFor(rows)

  return {
    rows,
    totalSpentCents,
    yourShareCents,
    expenseCount: rows.length,
    chartBuckets: buildChartBuckets(rows, granularity),
    categoryBreakdown,
  }
}
