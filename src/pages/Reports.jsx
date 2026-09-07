import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Download } from 'lucide-react'
import * as storage from '../data/storage.js'
import { useStoreVersion, useStoreReady } from '../hooks/useStore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import AppShell from '../components/AppShell.jsx'
import {
  Button,
  ButtonLink,
  Card,
  CategoryTag,
  EmptyState,
  Field,
  FormError,
  LoadingState,
  TextButton,
  TextInput,
  inputClass,
} from '../components/ui.jsx'
import {
  DEFAULT_FILTERS,
  buildMonthlyReport,
  isCustomRangeInvalid,
} from '../utils/monthlyReport.js'
import { downloadReportCsv } from '../utils/csvExport.js'
import { formatDate, formatMoney } from '../utils/money.js'

const copy = content.reports

function isDefaultFilters(filters) {
  return (
    filters.dateRange === DEFAULT_FILTERS.dateRange &&
    filters.groupId === DEFAULT_FILTERS.groupId &&
    filters.category === DEFAULT_FILTERS.category
  )
}

/* --------------------------------------------------------------- figures */

function Figure({ label, value }) {
  return (
    <Card>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="num mt-1 text-2xl font-extrabold text-ink">{value}</p>
    </Card>
  )
}

/* ---------------------------------------------------------------- filters */

function Filters({ filters, onChange, groups }) {
  const showCustom = filters.dateRange === 'custom'
  const rangeInvalid = isCustomRangeInvalid(filters)

  function set(patch) {
    onChange({ ...filters, ...patch })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={copy.dateRangeLabel} id="reports-date-range">
          <select
            id="reports-date-range"
            className={inputClass}
            value={filters.dateRange}
            onChange={(event) => set({ dateRange: event.target.value })}
          >
            <option value="all">{copy.rangeAllTime}</option>
            <option value="thisMonth">{copy.rangeThisMonth}</option>
            <option value="last3Months">{copy.rangeLast3Months}</option>
            <option value="last12Months">{copy.rangeLast12Months}</option>
            <option value="custom">{copy.rangeCustom}</option>
          </select>
        </Field>

        <Field label={copy.groupLabel} id="reports-group">
          <select
            id="reports-group"
            className={inputClass}
            value={filters.groupId}
            onChange={(event) => set({ groupId: event.target.value })}
          >
            <option value="all">{copy.allGroups}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={copy.categoryLabel} id="reports-category">
          <select
            id="reports-category"
            className={inputClass}
            value={filters.category}
            onChange={(event) => set({ category: event.target.value })}
          >
            <option value="all">{copy.allCategories}</option>
            {content.categories.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {showCustom ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.customFrom} id="reports-from">
            <TextInput
              id="reports-from"
              type="date"
              className="num"
              value={filters.customFrom}
              onChange={(event) => set({ customFrom: event.target.value })}
            />
          </Field>
          <Field label={copy.customTo} id="reports-to">
            <TextInput
              id="reports-to"
              type="date"
              className="num"
              value={filters.customTo}
              onChange={(event) => set({ customTo: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      {rangeInvalid ? <FormError>{copy.rangeInvalidError}</FormError> : null}

      {!isDefaultFilters(filters) ? (
        <div>
          <TextButton type="button" onClick={() => onChange(DEFAULT_FILTERS)}>
            {copy.clearFilters}
          </TextButton>
        </div>
      ) : null}
    </Card>
  )
}

/* ------------------------------------------------------------------ chart */

/**
 * The on-bar tick text, distinct from `bucket.label` (used in full for the
 * tooltip and the sr-only table): repeating the year on every single bar
 * ("Mar 2026", "Apr 2026", "May 2026"...) doesn't fit the narrow per-bar
 * slot without the labels running into each other, so the year is dropped
 * except where it actually changes from the previous bar (or the first bar)
 * — "Mar 2026, Apr, May, ... Dec, Jan 2027". Quarter labels ("Q1 2026")
 * shorten the same way; year-granularity labels ("2026") are already short
 * enough to show in full every time.
 */
function tickLabel(bucket, index, buckets) {
  const parts = bucket.label.split(' ')
  if (parts.length !== 2) return bucket.label

  const [unit, year] = parts
  const previousYear = index > 0 ? buckets[index - 1].label.split(' ')[1] : null
  return year === previousYear ? unit : bucket.label
}

/**
 * Hand-rolled inline SVG — no charting dependency, matching how this app
 * already avoids component libraries everywhere else. Each bar is its own
 * focusable element with a native `<title>` (announced as the accessible
 * name on keyboard focus, and a browser-native fallback tooltip) plus a
 * custom on-brand tooltip driven by hover/focus state for sighted mouse and
 * keyboard use; the `sr-only` table beneath gives screen-reader users the
 * same data as a plain list to scan instead of navigating bar by bar.
 *
 * Every bar carries its own total in a fixed row above the plot — same
 * height for every bar regardless of how tall its bar is — rather than
 * hugging each bar's individual peak: that keeps the figures in one legible
 * line to scan across, and guarantees they never collide with a tall
 * neighbor. The hover/focus tooltip still anchors to that specific bar's
 * own peak, since at that point only one is showing at a time.
 */
function SpendingChart({ buckets }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const maxCents = Math.max(1, ...buckets.map((bucket) => bucket.cents))
  const barWidth = 36
  const gap = 24
  const chartHeight = 120
  const labelGap = 18 // reserved row above the plot for each bar's total
  const tickGap = 24 // reserved row below the baseline for the month tick
  const height = labelGap + chartHeight + tickGap
  const width = Math.max(buckets.length * (barWidth + gap) - gap, barWidth)

  const active = activeIndex != null ? buckets[activeIndex] : null
  // Centered on the bar for everything but the two ends: a centered
  // tooltip over the first or last bar overhangs past the scrollable
  // area's edge and gets clipped by this wrapper's own overflow-x, so
  // those two pin to the bar's inner edge instead and grow inward.
  const isFirstBar = activeIndex === 0
  const isLastBar = activeIndex === buckets.length - 1
  const activeBarX = active ? activeIndex * (barWidth + gap) : 0
  const tooltipLeft = isFirstBar
    ? activeBarX
    : isLastBar
      ? activeBarX + barWidth
      : activeBarX + barWidth / 2
  const tooltipAlign = isFirstBar
    ? ''
    : isLastBar
      ? '-translate-x-full'
      : '-translate-x-1/2'

  // mouseleave/blur only clears the tooltip if it's still the bar that
  // opened it — keeps a stray leave/blur from a bar you've already moved
  // past from clobbering the one you just moved to.
  function releaseActive(index) {
    setActiveIndex((current) => (current === index ? null : current))
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">{copy.chartHeading}</h2>
      <div className="relative mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          preserveAspectRatio="xMinYMid meet"
          className="min-w-full"
        >
          {buckets.map((bucket, index) => {
            const barHeight = Math.max(
              (bucket.cents / maxCents) * chartHeight,
              bucket.cents > 0 ? 2 : 0,
            )
            const x = index * (barWidth + gap)
            const barY = labelGap + (chartHeight - barHeight)
            return (
              <g
                key={bucket.key}
                className="group"
                tabIndex={0}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => releaseActive(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => releaseActive(index)}
              >
                <title>{`${formatMoney(bucket.cents)} in ${bucket.label}`}</title>
                <text
                  x={x + barWidth / 2}
                  y={labelGap - 6}
                  textAnchor="middle"
                  className="num fill-ink text-[10px] font-semibold"
                >
                  {formatMoney(bucket.cents)}
                </text>
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  className="fill-primary opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                {/* Invisible hit area spanning the full plot height — a
                    quiet $0 month's bar is only 2px tall, far too small a
                    target to reliably hover or land a tooltip on by itself. */}
                <rect
                  x={x}
                  y={labelGap}
                  width={barWidth}
                  height={chartHeight}
                  fill="transparent"
                />
                <text
                  x={x + barWidth / 2}
                  y={labelGap + chartHeight + 16}
                  textAnchor="middle"
                  className="fill-ink-muted text-[10px]"
                >
                  {tickLabel(bucket, index, buckets)}
                </text>
              </g>
            )
          })}
        </svg>

        {active ? (
          // Anchored just below the total-label row rather than each bar's
          // own peak: `overflow-x-auto` on this wrapper forces `overflow-y`
          // to compute as `auto` too (the CSS overflow spec ties them
          // together whenever only one axis is `visible`), so anything
          // positioned above y=0 here gets silently clipped — the tallest
          // bar's tooltip would vanish. Anchoring below the labels keeps it
          // in-bounds for every bar; it's allowed to overlap a tall bar's
          // own top edge, which reads fine for a hover-only overlay.
          <div
            className={`pointer-events-none absolute z-10 ${tooltipAlign} whitespace-nowrap rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs text-ink`}
            style={{
              left: tooltipLeft,
              top: labelGap + 4,
            }}
          >
            <span className="num font-semibold">
              {formatMoney(active.cents)}
            </span>
            <span className="ml-1.5 text-ink-muted">{active.label}</span>
          </div>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>{copy.chartHeading}</caption>
        <thead>
          <tr>
            <th>{copy.columnDate}</th>
            <th>{copy.yourShare}</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.key}>
              <td>{bucket.label}</td>
              <td>{formatMoney(bucket.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/* --------------------------------------------------------- by category */

function CategoryBreakdown({ items }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">{copy.categoryHeading}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.category} className="flex items-center gap-3">
            <CategoryTag category={item.category} />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-flat-bg">
              <div
                className="h-full rounded-full bg-flat-fg"
                style={{ width: `${item.percent}%` }}
              />
            </div>
            <span className="num shrink-0 text-sm font-semibold text-ink">
              {formatMoney(item.cents)}
            </span>
            <span className="w-9 shrink-0 text-right text-xs text-ink-muted">
              {item.percent}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* -------------------------------------------------------------- table */

function ExpenseTable({ rows, onExport }) {
  const exportDisabled = rows.length === 0

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <h2 className="text-lg font-semibold text-ink">
          {copy.tableHeading(rows.length)}
        </h2>
        <span title={exportDisabled ? copy.exportDisabledTitle : undefined}>
          <Button
            type="button"
            variant="secondary"
            onClick={onExport}
            disabled={exportDisabled}
            className="gap-2"
          >
            <Download size={16} />
            {copy.exportCsv}
          </Button>
        </span>
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                {copy.columnDate}
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                {copy.columnGroup}
              </th>
              <th className="px-5 py-3 font-medium">
                {copy.columnDescription}
              </th>
              <th className="px-5 py-3 font-medium">{copy.columnCategory}</th>
              <th className="px-5 py-3 text-right font-medium">
                {copy.columnAmount}
              </th>
              <th className="px-5 py-3 text-right font-medium">
                {copy.columnYourShare}
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                {copy.columnPaidBy}
              </th>
              <th className="px-5 py-3 font-medium">
                {copy.columnSplitBetween}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                  {formatDate(row.date)}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <Link
                    to={`/group/${row.groupId}`}
                    className="text-ink transition-colors hover:text-primary"
                  >
                    {row.groupName}
                  </Link>
                </td>
                <td
                  className="max-w-[200px] truncate px-5 py-3 text-ink"
                  title={row.description}
                >
                  {row.description}
                </td>
                <td className="px-5 py-3">
                  <CategoryTag category={row.category} />
                </td>
                <td className="num px-5 py-3 text-right font-semibold text-ink">
                  {formatMoney(row.amountCents)}
                </td>
                <td className="num px-5 py-3 text-right text-ink-soft">
                  {row.yourShareCents == null
                    ? '—'
                    : formatMoney(row.yourShareCents)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                  {row.paidByName}
                </td>
                <td
                  className="max-w-[200px] truncate px-5 py-3 text-ink-soft"
                  title={row.participantNames.join(', ')}
                >
                  {row.participantNames.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ page */

export default function Reports() {
  useDocumentTitle(content.pageTitles.reports)
  const { user } = useAuth()
  const version = useStoreVersion()
  const ready = useStoreReady()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const groups = useMemo(
    () => storage.listGroupsForEmail(user.email),
    [user.email, version],
  )

  // Whether the account has any non-deleted expense at all, regardless of
  // the current filters — distinguishes "nothing recorded yet" from "these
  // filters match nothing" (two different empty states below).
  const hasAnyExpenses = useMemo(
    () => groups.some((group) => storage.listExpenses(group.id).length > 0),
    [groups, version],
  )

  const report = useMemo(
    () => buildMonthlyReport({ userEmail: user.email, filters }),
    [user.email, filters, version],
  )

  function handleExport() {
    downloadReportCsv(report.rows)
    toast.success(copy.exportedToast)
  }

  let body
  if (!ready) {
    body = <LoadingState />
  } else if (groups.length === 0) {
    body = (
      <EmptyState title={copy.emptyNoGroupsTitle} body={copy.emptyNoGroupsBody}>
        <ButtonLink to="/group/new">{copy.createGroup}</ButtonLink>
      </EmptyState>
    )
  } else if (!hasAnyExpenses) {
    body = (
      <EmptyState
        title={copy.emptyNoExpensesTitle}
        body={copy.emptyNoExpensesBody}
      />
    )
  } else {
    body = (
      <div className="flex flex-col gap-6">
        <Filters filters={filters} onChange={setFilters} groups={groups} />

        {report.rows.length === 0 ? (
          <>
            {/* Still show the chart's shape — a trailing 6-month, all-$0
                placeholder range (see buildChartBuckets in monthlyReport.js)
                — rather than letting the whole report vanish behind the
                empty state below. */}
            <SpendingChart buckets={report.chartBuckets} />
            <EmptyState
              title={copy.emptyFilteredTitle}
              body={copy.emptyFilteredBody}
            >
              <TextButton
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                {copy.clearFilters}
              </TextButton>
            </EmptyState>
          </>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <Figure
                label={copy.totalSpent}
                value={formatMoney(report.totalSpentCents)}
              />
              <Figure
                label={copy.yourShare}
                value={formatMoney(report.yourShareCents)}
              />
              <Figure
                label={copy.expensesLabel}
                value={String(report.expenseCount)}
              />
            </div>

            <SpendingChart buckets={report.chartBuckets} />
            <CategoryBreakdown items={report.categoryBreakdown} />
            <ExpenseTable rows={report.rows} onExport={handleExport} />
          </>
        )}
      </div>
    )
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-ink">{copy.heading}</h1>
      <p className="mt-1 text-sm text-ink-soft">{copy.intro}</p>
      <div className="mt-8">{body}</div>
    </AppShell>
  )
}
