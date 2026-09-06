import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import * as storage from '../data/storage.js'
import { useStoreVersion } from '../hooks/useStore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import AppShell from '../components/AppShell.jsx'
import { BalancePill, ButtonLink, EmptyState } from '../components/ui.jsx'
import { formatMoney } from '../utils/money.js'
import { balanceFor, totalsFor } from '../utils/balances.js'

const copy = content.dashboard

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
        </div>

        <BalancePill cents={group.balance} />
      </Link>
    </li>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const version = useStoreVersion()

  const groups = useMemo(() => {
    return storage.listGroupsForEmail(user.email).map((group) => {
      const expenses = storage.listExpenses(group.id)
      const settlements = storage.listSettlements(group.id)
      const emails = group.members.map((member) => member.email)
      return {
        ...group,
        expenseCount: expenses.length,
        pendingCount: group.members.filter(
          (member) => member.status === 'pending',
        ).length,
        balance: balanceFor(user.email, emails, expenses, settlements),
      }
    })
  }, [user.email, version])

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
          <h2 className="text-lg font-semibold text-ink">
            {copy.groupsHeading(groups.length)}
          </h2>
          {groups.length > 0 ? (
            <ButtonLink to="/group/new" variant="secondary" className="gap-2">
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
          ) : (
            <ul className="flex flex-col gap-2">
              {groups.map((group) => (
                <GroupRow key={group.id} group={group} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
