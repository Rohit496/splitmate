# Reports

A new top-level page: your expense history across every group you're in, as
a chart and a filterable table, with a CSV download. It complements
Dashboard rather than replacing anything on it — Dashboard answers "who owes
whom right now"; Reports answers "what did I spend, and when."

This is a spec only. Nothing here is built yet.

## Non-goals (v1)

- **No balance/settle-up math.** No owed/owe/net figures, no
  `netBalances`/`groupBalances`/`simplifySettlements`. That's Dashboard's and
  GroupDetail's job. Reports never subtracts what someone else owes you —
  it's a record of spending, not a ledger of debts.
- **No settlements.** `settlements` rows (recorded payments) are a distinct
  concept from `expenses` in the data model and are out of scope for a
  feature literally scoped to "expense history." A "Payments" view could
  follow later.
- **No per-member breakdown** ("who paid the most") — only a by-category
  breakdown, described below.
- **No pagination/virtualization** of the table in v1. Splitmate's expected
  data volume (personal expense-splitting, not enterprise) doesn't need it
  yet; flag it as a follow-up if a real account's table gets sluggish.
- **CSV only** — no PDF, no scheduled/emailed exports, no saved report
  presets.
- **USD only**, same as the rest of the app — no multi-currency handling.

## Entry point

A new route, `/reports`, gated by `RequireAuth` like every other authenticated
page. Reached via a plain text link added to `AppShell`'s header, next to the
`Wordmark` (which stays the home/dashboard link — no change to that). This
makes Reports reachable from anywhere in the app, not just from Dashboard.

```
┌─────────────────────────────────────────────────────────┐
│  🧡 Splitmate      Reports              👤 Priya  [Sign out] │  ← AppShell header
└─────────────────────────────────────────────────────────┘
```

## Page layout

```
Reports
Your expense history across every group, in one place.

┌ Filters ────────────────────────────────────────────────┐
│ [Date range: All time ▾]  [Group: All groups ▾]  [Category: All categories ▾] │
└───────────────────────────────────────────────────────────┘

┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Total spent   │ │ Your share    │ │ Expenses      │
│ $4,820        │ │ $1,910        │ │ 38            │
└───────────────┘ └───────────────┘ └───────────────┘

Your spending over time
┌───────────────────────────────────────────────────────────┐
│   ▂  ▅  ▃  ▇  ▄  ▂  ▆  ▃  ▅  ▂  ▇  ▃                       │
│  Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec           │
└───────────────────────────────────────────────────────────┘

By category
┌───────────────────────────────────────────────────────────┐
│ Food & Drinks   ████████████████░░░░  $2,140   44%        │
│ Accommodation   ██████████░░░░░░░░░░  $1,300   27%        │
│ Transport       █████░░░░░░░░░░░░░░░  $  640   13%        │
│ …                                                          │
└───────────────────────────────────────────────────────────┘

All expenses (38)                              [⬇ Export CSV]
┌───────────────────────────────────────────────────────────┐
│ Date        Group      Description   Category  Amount  Your Share  Paid By        Split Between │
│ 12 Mar 2026 Goa trip   Dinner…        Food       $85.00   $28.33    Priya          Priya, Bob, Zo │
│ 10 Mar 2026 Flatmates  Electricity    Utilities  $60.00   $20.00    Zo             Priya, Bob, Zo │
│ …                                                                                                 │
└───────────────────────────────────────────────────────────┘
```

Uses the app's existing visual language throughout — no new colors, no
shadows: `Card`/`cardClass` for every panel, `--color-flat-bg`/`-fg` for the
category bars (same token `CategoryTag` already reuses), tabular `num` class
for every amount, `PAGE`'s existing max-width and spacing.

### Filters

Three controls in a row (stacked on mobile, matching the app's existing
responsive pattern of `sm:grid-cols-*` collapsing to one column):

- **Date range** — a `<select>` of presets: **This month**, **Last 3
  months**, **Last 12 months**, **All time**, **Custom**. Default: **All
  time**, so a new report isn't misleadingly empty just because the default
  window was too narrow. Choosing **Custom** reveals two native date inputs
  (`From` / `To`, same `TextInput type="date"` pattern `AddExpenseModal`
  already uses). If `From` is after `To`, show an inline error
  (`FormError`-style, reusing that component) and don't apply the range —
  same "never crash on bad input" posture as the rest of the app.
- **Group** — a `<select>`: **All groups** (default) plus one entry per
  group from `storage.listGroupsForEmail(user.email)`, keyed by `id` (two
  groups can share a display name, so never match on name). Every group the
  user belongs to is listed even if it has zero expenses in the current date
  range — picking one just lands on the "no expenses match these filters"
  empty state below.
- **Category** — a `<select>`: **All categories** (default) plus
  `content.categories.options` verbatim, so it always matches whatever
  categories `AddExpenseModal` actually offers.

All three combine with AND semantics. A **Clear filters** text button
(`TextButton`) appears once any filter differs from its default and resets
all three at once.

### Summary figures

Three cards, same `Figure`-style layout Dashboard uses
(`sm:grid-cols-3`, `rounded-card border border-line bg-surface p-5`, label
on top, bold `num` amount below), computed over whatever the filters
currently include:

- **Total spent** — sum of the full `amountCents` of every included expense
  (not divided by participant — the whole expense, exactly like the amount
  shown on an expense row in `GroupDetail`).
- **Your share** — sum of _your_ per-expense split only: for each included
  expense, `expenseShares(expense)` (already in `utils/balances.js`) filtered
  to `email === user.email`; an expense you weren't a participant in
  contributes 0. This is spend, not balance — it is never netted against
  what anyone owes you, unlike Dashboard's figures.
- **Expenses** — count of included expense rows.

No tone coloring (no green/red) on any of these three — they're neutral
totals, not a balance, so they always render in `text-ink` the way
`GroupDetail`'s "spent in total" line does, never `pos`/`neg` tones.

### Chart — "Your spending over time"

A bar chart of **Your share** (not Total spent — this is the personal
spending trend the feature is named for) bucketed over time:

- **Bucketing rule**, applied to the span between the earliest and latest
  included expense date: **by month** if that span is ≤ 24 months, **by
  quarter** if ≤ 8 years, **by year** beyond that. This keeps the bar count
  readable regardless of how much history an account has, without a manual
  zoom control in v1.
- Each bar's height is proportional to that bucket's "Your share" total; the
  x-axis shows bucket labels (`Mar 2026`, `Q1 2026`, or `2026`, matching the
  chosen granularity).
- **No new dependency.** Rendered as hand-rolled inline SVG (bars + axis
  labels), matching how this app already avoids component libraries for
  everything else (hand-rolled modals, no chart/UI kit in `package.json`).
- **Accessible by construction, not by afterthought**: the SVG bars are
  `aria-hidden`; a visually-hidden (`sr-only`) `<table>` right below carries
  the same bucket → amount data for screen readers, and each bar is still a
  real focusable element exposing its own value as a tooltip/`aria-label`
  (e.g. `"$310 in March 2026"`) for sighted keyboard users. This mirrors the
  project's existing accessibility bar (see the `accessibility` skill) —
  don't ship a chart whose only expression of its data is visual.
- The whole chart section is omitted (not rendered empty) when the filtered
  expense set is empty — folded into the empty-state handling below, the
  same way `GroupDetail` skips straight to an `EmptyState` instead of
  rendering an empty list.

### By category

A simple horizontal breakdown, not a second chart library: one row per
category present in the filtered set, sorted by amount descending —
`CategoryTag` + a proportional bar (`bg-flat-bg`, width = percentage of
**Total spent**, reusing the same token `CategoryTag` already uses rather
than inventing a per-category palette) + the amount + the percentage.
Categories that don't appear in the current filter simply don't get a row
(no zero-value clutter).

### Table — "All expenses"

One row per included expense, **newest first** (matches every other expense
list on-screen, e.g. `GroupDetail`'s). Columns:

| Column        | Source                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date          | `expense.date`, formatted via `formatDate`                                                                                                                                          |
| Group         | the owning group's name, linking to `/group/:id`                                                                                                                                    |
| Description   | `expense.description` (truncates with `title` for the full text on hover, same as `GroupRow`'s truncate pattern)                                                                    |
| Category      | `CategoryTag`                                                                                                                                                                       |
| Amount        | `formatMoney(expense.amountCents)` — the full expense                                                                                                                               |
| Your Share    | `formatMoney` of your `expenseShares` entry, or `—` if you weren't a participant                                                                                                    |
| Paid By       | payer's name, resolved against that group's member list (falls back to the raw email if somehow unresolved — same defensive fallback `groupExport.js`'s `resolveName` already uses) |
| Split Between | participant names, comma-joined                                                                                                                                                     |

The **Export CSV** button (`Button variant="secondary"`, `Download` icon —
same treatment as `GroupDetail`'s existing "Export history" button) sits
above the table, disabled with the same `title`-tooltip-when-disabled
pattern when the filtered set is empty.

## Data & calculations

Everything is derived, never stored — same philosophy as `utils/balances.js`
("Nothing is ever stored... recomputed... every time they are read").

1. Start from every group in `storage.listGroupsForEmail(user.email)`.
2. For each, read `storage.listExpenses(groupId)` — already excludes
   soft-deleted rows (`is_deleted`), so nothing extra to filter there.
3. Apply the three filters (group id match, category match, date-string
   range match — `expense.date` is already `YYYY-MM-DD`, so range
   comparison is a plain lexicographic string comparison, no timezone
   conversion needed, same as `formatDate`/`todayISO` already assume
   elsewhere).
4. From the resulting flat list, compute:
   - **Total spent**: `sum(expense.amountCents)`.
   - **Your share**: `sum(expenseShares(expense).find(s => s.email === user.email)?.cents ?? 0)`.
   - **Expenses**: `list.length`.
   - **Chart buckets**: group by the bucketing rule above, summing "Your
     share" per bucket.
   - **Category breakdown**: group by `expense.category || content.categories.default` (same fallback `CategoryTag` already applies for expenses saved before the field existed), summing `amountCents`.
5. Recomputed inside a `useMemo` keyed on `[user.email, filters, version]`
   where `version` is `useStoreVersion()` — identical reactivity pattern to
   `Dashboard.jsx`, so a write anywhere in the app (add/delete an expense)
   updates the report immediately, no manual refresh.

## CSV export

Downloads exactly what's currently on screen — the same filtered set the
table and chart are built from, not always the full unfiltered history. This
is the natural generalization of the existing per-group "Export history"
button (`utils/groupExport.js`) to span every group at once; the row shape
matches it with one addition (`Group`) and one omission (settlements are
still out of scope, unchanged from that existing export):

**Columns** (in order): `Date, Group, Description, Category, Amount, Your
Share, Paid By, Split Between, Notes`

- `Amount` and `Your Share` are plain decimal strings (`"85.00"`, not
  `formatMoney`'s `"$85.00"`) — same reasoning already documented in
  `groupExport.js`: this feeds a file meant to open cleanly in Excel/Sheets,
  not the screen.
- `Notes` stays an honest empty column, same as `groupExport.js` — there is
  still no "notes" field anywhere in the Expense model.
- Row order is **oldest first** (opposite of the on-screen table), matching
  `groupExport.js`'s existing convention for its own CSV, so the two exports
  stay consistent with each other.
- Same RFC 4180 field escaping (quote a field containing a comma/quote/
  newline, double any internal quote) and the same CRLF line endings —
  reuse, don't reimplement. Worth pulling `csvEscapeField`/`toCsv`/`slugify`
  out of `groupExport.js` into a shared `utils/csv.js` at implementation
  time so both exports share one implementation instead of two copies
  drifting apart.
- **Filename**: `splitmate-report-{YYYY-MM}.csv`, where `{YYYY-MM}` is
  today's year and month (via `todayISO().slice(0, 7)`) — not derived from
  the active filters, so two exports taken the same month share one name
  (and, per browser convention, the second download gets suffixed `(1)`
  rather than silently overwriting the first).
- Success path: `toast.success(content.reports.exportedToast)`, matching
  `GroupDetail`'s `historyExportedToast` pattern.

## Empty states

Three distinct empty states — don't collapse them into one message, since
they mean different things to the user:

1. **No groups at all.** Same shape as Dashboard's own empty state: title +
   body + a "Create group" CTA to `/group/new`. (Own copy under
   `content.reports`, per the "centralized copy, grouped by feature"
   convention — not borrowed from `content.dashboard`, even though the
   wording will look similar.)
2. **In groups, but zero expenses anywhere** (a brand new account). Title:
   "Nothing to report yet." Body pointing at adding an expense in any group.
   No chart, no category breakdown, no table — just the `EmptyState` card,
   same as `GroupDetail` skips straight past an empty expense list.
3. **Has expenses, but the current filter combination matches none** (e.g. a
   group filter picked that has no expenses in the selected date range).
   Title: "No expenses match these filters." Body suggests widening the
   range or clearing a filter, plus the **Clear filters** action inline in
   the empty state itself, not just up in the filter row.

## Other edge cases

- **Pending members** (invited, not yet registered) as `Paid By` or in
  `Split Between`: resolved the same way `GroupDetail` and `groupExport.js`
  already do — by name off the group's member list, regardless of
  `pending`/`active` status. No status badge needed inline in the table
  (the existing per-row expense lists elsewhere don't show one either).
- **Removed members**: impossible to end up with a dangling email in old
  rows — `removeMember` is blocked at the DB level
  (`prevent_member_removal_with_expenses`) whenever that email appears in
  any non-deleted expense, so every `paidBy`/participant always resolves
  against the group's current member list.
- **A group with zero expenses in range still appears in the Group filter**
  — it's sourced from membership, not from data, so selecting it legitimately
  lands on empty-state 3 above, not a bug.
- **Very long descriptions**: table cell truncates with the full text
  available via `title`, same as `GroupRow`'s group-name truncation.
- **Custom range validation**: `From` after `To` shows an inline error and
  simply doesn't apply — never a thrown error or a broken chart.
- **Old expenses saved before `category` existed**: fall back to
  `content.categories.default` ("Other"), same fallback `CategoryTag`
  already applies — they still get a category-breakdown row, just under
  "Other."
- **Expenses without a `splits` array** (saved before manual splitting
  existed): `expenseShares` already falls back to an equal division across
  `participants` for these, so "Your Share" still computes correctly with no
  special-casing here.

## Copy (new `content.reports` section)

Following the existing convention — every string lives in `constant.js`,
grouped by feature, count/name-dependent entries as functions:

```js
reports: {
  navLabel: 'Reports',
  heading: 'Reports',
  intro: 'Your expense history across every group, in one place.',

  dateRangeLabel: 'Date range',
  groupLabel: 'Group',
  categoryLabel: 'Category',
  allGroups: 'All groups',
  allCategories: 'All categories',
  rangeThisMonth: 'This month',
  rangeLast3Months: 'Last 3 months',
  rangeLast12Months: 'Last 12 months',
  rangeAllTime: 'All time',
  rangeCustom: 'Custom',
  customFrom: 'From',
  customTo: 'To',
  rangeInvalidError: 'Start date must be before end date.',
  clearFilters: 'Clear filters',

  totalSpent: 'Total spent',
  yourShare: 'Your share',
  expenseCount: (count) => `${count} ${count === 1 ? 'expense' : 'expenses'}`,

  chartHeading: 'Your spending over time',
  categoryHeading: 'By category',
  tableHeading: (count) => (count > 0 ? `All expenses (${count})` : 'All expenses'),
  columnDate: 'Date',
  columnGroup: 'Group',
  columnDescription: 'Description',
  columnCategory: 'Category',
  columnAmount: 'Amount',
  columnYourShare: 'Your Share',
  columnPaidBy: 'Paid By',
  columnSplitBetween: 'Split Between',

  exportCsv: 'Export CSV',
  exportDisabledTitle: 'Nothing to export yet.',
  exportedToast: 'CSV downloaded',

  emptyNoGroupsTitle: 'No groups yet',
  emptyNoGroupsBody:
    'Reports fill in once you’re in a group with some expenses on it.',
  createGroup: 'Create group',

  emptyNoExpensesTitle: 'Nothing to report yet',
  emptyNoExpensesBody:
    'Add an expense in any of your groups and it’ll show up here.',

  emptyFilteredTitle: 'No expenses match these filters',
  emptyFilteredBody: 'Try widening the date range, or clearing a filter.',
}
```

## Implementation pointers (non-binding)

For whoever picks this spec up:

- **New**: `src/pages/Reports.jsx`, `src/utils/reportsExport.js` (CSV
  building, analogous to `groupExport.js`), a `content.reports` block in
  `src/constant.js`.
- **Changed**: `src/App.jsx` (new `/reports` route under `RequireAuth`),
  `src/components/AppShell.jsx` (nav link).
- **Worth extracting**: `csvEscapeField`/`toCsv`/`slugify` out of
  `groupExport.js` into a shared `src/utils/csv.js` so both exports use one
  implementation.
- **Reused as-is, no changes needed**: `storage.listGroupsForEmail`,
  `storage.listExpenses`, `utils/balances.js`'s `expenseShares`,
  `utils/money.js`'s `formatMoney`/`formatDate`/`toCents`,
  `hooks/useStore.js`'s `useStoreVersion`, and `components/ui.jsx`'s
  `Card`/`CategoryTag`/`EmptyState`/`TextInput`/`Field`/`FormError`/
  `TextButton`/`Button`.
