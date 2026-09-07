/**
 * Builds and downloads the Reports page's CSV — the multi-group superset of
 * `utils/groupExport.js`'s per-group "Export history" button. Takes the
 * already-filtered, already-resolved rows `monthlyReport.js` produces; does
 * no aggregation or storage reads of its own.
 */

import { todayISO } from './money.js'

// Human-facing column labels, in order — deliberately not the same as the
// camelCase object keys below, so the mapping from row object to CSV line
// stays explicit rather than derived from key names (same convention
// groupExport.js uses).
const CSV_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'group', header: 'Group' },
  { key: 'description', header: 'Description' },
  { key: 'category', header: 'Category' },
  { key: 'amount', header: 'Amount' },
  { key: 'yourShare', header: 'Your Share' },
  { key: 'paidBy', header: 'Paid By' },
  { key: 'splitBetween', header: 'Split Between' },
  { key: 'notes', header: 'Notes' },
]

/**
 * RFC 4180 field escaping: a field containing a comma, a double-quote, or a
 * newline gets wrapped in double quotes, with any internal double-quote
 * doubled. `description` is free-text and the one column that could
 * plausibly contain any of these, but every field is run through this for
 * safety — same rule `groupExport.js` applies.
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
  // CRLF is the RFC 4180 line ending and what Excel expects — same as
  // groupExport.js.
  return lines.join('\r\n')
}

/**
 * Maps `monthlyReport.js`'s resolved rows (cents, newest-first) into the
 * CSV's plain-decimal, oldest-first shape, then joins them into CSV text.
 * Always produces a valid CSV (header row only, for an empty list), never
 * throws.
 *
 * @param {Array<object>} reportRows
 * @returns {string}
 */
export function buildReportCsv(reportRows) {
  const csvRows = reportRows
    .map((row) => ({
      date: row.date,
      group: row.groupName,
      description: row.description,
      category: row.category,
      // Plain decimal string, no currency symbol — same reasoning as
      // groupExport.js: this feeds a file meant to open cleanly in
      // Excel/Sheets, not the screen.
      amount: (row.amountCents / 100).toFixed(2),
      // Empty, not "0.00" — an expense you weren't a participant in isn't a
      // zero share, there's no share to report at all.
      yourShare:
        row.yourShareCents == null ? '' : (row.yourShareCents / 100).toFixed(2),
      paidBy: row.paidByName,
      // Semicolon-space, not a comma: an unquoted comma inside a CSV cell is
      // a classic bug source, so give the CSV an unambiguous separator to
      // work with (same as groupExport.js).
      splitBetween: row.participantNames.join('; '),
      // No "notes" field anywhere in the Expense model — an honest empty
      // column, same as groupExport.js.
      notes: '',
    }))
    // The on-screen table is newest-first; the CSV's own convention (matching
    // groupExport.js) is the opposite: oldest first.
    .sort((a, b) => a.date.localeCompare(b.date))

  return toCsv(csvRows)
}

/**
 * Builds the Reports CSV and triggers a browser download of it — the same
 * Blob + object URL + temporary `<a download>` pattern as
 * `groupExport.js`'s `downloadGroupHistory`.
 *
 * The filename is stamped with the current year-month, not the active
 * filters — two exports taken the same month share one name (and, per
 * browser convention, a second download that same month is suffixed "(1)"
 * rather than silently overwriting the first).
 *
 * @param {Array<object>} reportRows
 * @returns {string} the CSV text that was downloaded, mainly for testing.
 */
export function downloadReportCsv(reportRows) {
  const csv = buildReportCsv(reportRows)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `splitmate-report-${todayISO().slice(0, 7)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return csv
}
