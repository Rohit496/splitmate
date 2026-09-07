import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import * as storage from '../data/storage.js'
import { useStoreVersion, useStoreReady } from '../hooks/useStore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import AppShell from '../components/AppShell.jsx'
import BudgetBar from '../components/BudgetBar.jsx'
import {
  BalancePill,
  ButtonLink,
  EmptyState,
  LoadingState,
} from '../components/ui.jsx'
import { formatMoney, totalSpentCents } from '../utils/money.js'
import { groupBalances, totalsFor } from '../utils/balances.js'

const copy = content.dashboard

/** Active/Settled toggle above the groups list. Ember Orange marks the
    selected tab (the app's one accent color, reserved for interactive/
    active state) via a bottom border rather than a filled background —
    no new component needed elsewhere yet, so this stays local to
    Dashboard rather than moving into ui.jsx. */
function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border-b-2 px-0.5 pb-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/** One of the three headline figures. The number is the content; the label is a caption. */
function Figure({ label, cents, tone }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`num mt-1 text-2xl font-extrabold ${tone}`}>
        {formatMoney(cents)}
      </p>
    </div>
  )
}

function GroupRow({ group }) {
  return (
    <li>
      <Link
        to={`/group/${group.id}`}
        className="flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-ink-muted"
      >
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">
            {group.name}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {copy.personCount(group.members.length)}
            {group.pendingCount > 0
              ? copy.pendingSuffix(group.pendingCount)
              : ''}
            {copy.expenseSuffix(group.expenseCount)}
          </p>
          {group.budgetCents != null ? (
            <div className="mt-2">
              <BudgetBar
                spentCents={group.spentCents}
                budgetCents={group.budgetCents}
                size="compact"
                label={
                  group.spentCents > group.budgetCents
                    ? copy.budgetOverBy(
                        formatMoney(group.spentCents - group.budgetCents),
                      )
                    : copy.budgetPercent(
                        Math.round(
                          (group.spentCents / group.budgetCents) * 100,
                        ),
                      )
                }
              />
            </div>
          ) : null}
        </div>

        <BalancePill cents={group.balance} />
      </Link>
    </li>
  )
}

export default function Dashboard() {
  useDocumentTitle(content.pageTitles.dashboard)
  const { user } = useAuth()
  const version = useStoreVersion()
  const ready = useStoreReady()
  const [tab, setTab] = useState('active')

  const groups = useMemo(() => {
    return storage.listGroupsForEmail(user.email).map((group) => {
      const expenses = storage.listExpenses(group.id)
      const settlements = storage.listSettlements(group.id)
      const emails = group.members.map((member) => member.email)
      const { net, settlements: owed } = groupBalances(
        emails,
        expenses,
        settlements,
      )
      return {
        ...group,
        expenseCount: expenses.length,
        spentCents: totalSpentCents(expenses),
        pendingCount: group.members.filter(
          (member) => member.status === 'pending',
        ).length,
        balance: net.get(user.email) ?? 0,
        // A group with no expenses yet has nothing to settle, so it counts
        // as Active rather than Settled — only a group that's actually
        // been used and come out fully even (every simplified settlement
        // is empty) counts as Settled.
        settled: expenses.length > 0 && owed.length === 0,
      }
    })
  }, [user.email, version])

  const activeGroups = useMemo(
    () => groups.filter((group) => !group.settled),
    [groups],
  )
  const settledGroups = useMemo(
    () => groups.filter((group) => group.settled),
    [groups],
  )
  const visibleGroups = tab === 'active' ? activeGroups : settledGroups

  const totals = useMemo(
    () => totalsFor(groups.map((group) => group.balance)),
    [groups],
  )

  const netTone =
    totals.net > 0
      ? 'text-pos-fg'
      : totals.net < 0
        ? 'text-neg-fg'
        : 'text-flat-fg'

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-ink">{copy.heading}</h1>
      <p className="mt-1 text-sm text-ink-soft">{copy.intro}</p>

      {!ready ? (
        <div className="mt-8">
          <LoadingState />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            <Figure
              label={copy.owedToYou}
              cents={totals.owed}
              tone={totals.owed ? 'text-pos-fg' : 'text-flat-fg'}
            />
            <Figure
              label={copy.youOwe}
              cents={totals.owe}
              tone={totals.owe ? 'text-neg-fg' : 'text-flat-fg'}
            />
            <Figure label={copy.netBalance} cents={totals.net} tone={netTone} />
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              {groups.length > 0 ? (
                <div className="flex gap-5">
                  <TabButton
                    active={tab === 'active'}
                    onClick={() => setTab('active')}
                  >
                    {copy.activeTab(activeGroups.length)}
                  </TabButton>
                  <TabButton
                    active={tab === 'settled'}
                    onClick={() => setTab('settled')}
                  >
                    {copy.settledTab(settledGroups.length)}
                  </TabButton>
                </div>
              ) : null}
              {groups.length > 0 ? (
                <ButtonLink
                  to="/group/new"
                  variant="secondary"
                  className="gap-2"
                >
                  <Plus size={16} />
                  {copy.newGroup}
                </ButtonLink>
              ) : null}
            </div>

            <div className="mt-4">
              {groups.length === 0 ? (
                <EmptyState title={copy.emptyTitle} body={copy.emptyBody}>
                  <ButtonLink to="/group/new" className="gap-2">
                    <Plus size={16} />
                    {copy.createGroup}
                  </ButtonLink>
                </EmptyState>
              ) : visibleGroups.length === 0 ? (
                <EmptyState
                  title={
                    tab === 'active'
                      ? copy.emptyActiveTitle
                      : copy.emptySettledTitle
                  }
                  body={
                    tab === 'active'
                      ? copy.emptyActiveBody
                      : copy.emptySettledBody
                  }
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleGroups.map((group) => (
                    <GroupRow key={group.id} group={group} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
