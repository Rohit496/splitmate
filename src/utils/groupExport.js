/**
 * Flattens a group's live expense history into plain rows suitable for
 * export (CSV, etc.). Reads exclusively through `data/storage.js` — no
 * direct Supabase access here, per "Storage is the only data boundary" in
 * CLAUDE.md. Both `storage.getGroup` and `storage.listExpenses` are
 * synchronous reads off storage.js's already-warm in-memory cache, so this
 * stays synchronous too: no async/await, no network call of its own.
 */

import * as storage from '../data/storage.js'

/**
 * @param {string} groupId
 * @returns {Array<{
 *   date: string,
 *   description: string,
 *   category: string,
 *   amount: string,
 *   paidBy: string,
 *   splitBetween: string,
 *   notes: string,
 * }>}
 */
export function exportGroupHistory(groupId) {
  const group = storage.getGroup(groupId)
  if (!group) return []

  // Same resolution pattern as GroupDetail.jsx's `data` useMemo: email -> name
  // via the group's own member list, falling back to the raw email only if a
  // participant genuinely isn't a member (shouldn't normally happen).
  const nameOf = new Map(
    group.members.map((member) => [member.email, member.name]),
  )
  const resolveName = (email) => nameOf.get(email) ?? email

  const expenses = storage.listExpenses(group.id)

  return (
    expenses
      .map((expense) => ({
        date: expense.date,
        description: expense.description,
        category: expense.category,
        // Plain decimal string, no currency symbol — this feeds a CSV meant to
        // open cleanly in Excel/Sheets. `expense.amount` is already a plain
        // Number in dollars (see CLAUDE.md's Expense data model); don't run it
        // through formatMoney, which is for on-screen display and prepends "$".
        amount: expense.amount.toFixed(2),
        paidBy: resolveName(expense.paidBy),
        // Semicolon-space, not a comma: an unquoted comma inside a CSV cell is
        // a classic bug source, so give downstream CSV building an unambiguous
        // separator to work with.
        splitBetween: expense.participants.map(resolveName).join('; '),
        // There is no "notes" field anywhere in the Expense data model (see
        // CLAUDE.md) — an honest empty column, not a fabricated stand-in.
        notes: '',
      }))
      // listExpenses() returns newest-first (for on-screen display); export
      // order is the opposite: oldest first. Stable sort on the YYYY-MM-DD
      // string works fine lexicographically.
      .sort((a, b) => a.date.localeCompare(b.date))
  )
}

// Human-facing column labels, in order — deliberately not the same as the
// camelCase object keys above (e.g. "Paid By" vs `paidBy`), so the mapping
// from row object to CSV line is explicit rather than derived from key names.
const CSV_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'description', header: 'Description' },
  { key: 'category', header: 'Category' },
  { key: 'amount', header: 'Amount' },
  { key: 'paidBy', header: 'Paid By' },
  { key: 'splitBetween', header: 'Split Between' },
  { key: 'notes', header: 'Notes' },
]

/**
 * RFC 4180 field escaping: a field containing a comma, a double-quote, or a
 * newline gets wrapped in double quotes, with any internal double-quote
 * doubled. `description` is free-text and is the one column that could
 * plausibly contain any of these, but every field is run through this for
 * safety.
 */
function csvEscapeField(value) {
  const str = String(value ?? '')
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function toCsv(rows) {
  const lines = [
    CSV_COLUMNS.map((column) => csvEscapeField(column.header)).join(','),
  ]
  for (const row of rows) {
    lines.push(
      CSV_COLUMNS.map((column) => csvEscapeField(row[column.key])).join(','),
    )
  }
  // CRLF is the RFC 4180 line ending and what Excel expects; browsers/Sheets
  // are fine with it too.
  return lines.join('\r\n')
}

/**
 * Slugifies a group name for use in a filename: lowercase, any run of
 * non-alphanumeric characters collapsed to a single hyphen, no leading or
 * trailing hyphen. "Goa Trip" -> "goa-trip".
 */
function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Builds the full-history CSV for a group via `exportGroupHistory` and
 * triggers a browser download of it — the standard no-dependency
 * Blob + object URL + temporary `<a download>` pattern. Always produces a
 * valid CSV (header row only when the group has no expenses, or doesn't
 * exist), never throws.
 *
 * @param {string} groupId
 * @param {string} groupName
 * @returns {string} the CSV text that was downloaded, mainly for testing.
 */
export function downloadGroupHistory(groupId, groupName) {
  const rows = exportGroupHistory(groupId)
  const csv = toCsv(rows)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `splitmate-${slugify(groupName)}-history.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return csv
}
