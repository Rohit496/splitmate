import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Download, PlusCircle, Settings } from 'lucide-react'
import * as storage from '../data/storage.js'
import { downloadGroupHistory } from '../utils/groupExport.js'
import { useStoreVersion, useStoreReady } from '../hooks/useStore.js'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import AppShell from '../components/AppShell.jsx'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import BalanceBar from '../components/BalanceBar.jsx'
import BudgetBar from '../components/BudgetBar.jsx'
import {
  Avatar,
  Button,
  ButtonLink,
  CategoryTag,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../components/ui.jsx'
import { groupBalances } from '../utils/balances.js'
import { formatDate, formatMoney, totalSpentCents } from '../utils/money.js'

const copy = content.groupDetail

function NotFound() {
  return (
    <AppShell>
      <EmptyState title={copy.notFoundTitle} body={copy.notFoundBody}>
        <ButtonLink to="/dashboard" variant="secondary">
          {copy.backToGroups}
        </ButtonLink>
      </EmptyState>
    </AppShell>
  )
}

/**
 * One expense card. Hierarchy runs description → amount → meta, in that
 * priority order — the description is what you'd scan for, the amount is
 * what you'd stop for, and who-paid/how-split are details you'd read after.
 */
function ExpenseRow({ expense, payerName, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const shares = expense.participants.length
  const isCustom = expense.splitMode === 'manual'

  return (
    <li className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-ink-muted">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
          {expense.description}
        </p>
        <span className="num shrink-0 text-lg font-bold text-ink">
          {formatMoney(expense.amountCents)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <span className="truncate">
            {copy.payerLine(payerName, formatDate(expense.date))}
            {isCustom ? copy.customShare(shares) : copy.equalShare(shares)}
          </span>
          <CategoryTag category={expense.category} />
        </div>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={copy.removeAria(expense.description)}
          className="shrink-0 rounded-control px-1.5 py-1 text-xs font-medium text-ink-muted opacity-0 transition-all hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
        >
          {copy.remove}
        </button>
      </div>

      {confirming ? (
        <ConfirmModal
          title={copy.deleteConfirmTitle}
          body={copy.deleteConfirmBody(expense.description)}
          confirmLabel={copy.deleteConfirmLabel}
          onConfirm={() => {
            onDelete(expense.id)
            setConfirming(false)
          }}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </li>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const version = useStoreVersion()
  const ready = useStoreReady()
  const [isAdding, setIsAdding] = useState(false)
  const [settlingPairs, setSettlingPairs] = useState(() => new Set())

  const data = useMemo(() => {
    const group = storage.getGroup(id)
    if (!group) return null
    if (!group.members.some((member) => member.email === user.email))
      return null

    const expenses = storage.listExpenses(group.id)
    const recordedSettlements = storage.listSettlements(group.id)
    const emails = group.members.map((member) => member.email)
    const nameOf = new Map(
      group.members.map((member) => [member.email, member.name]),
    )
    const { settlements } = groupBalances(emails, expenses, recordedSettlements)

    /* Debts the current user is part of come first; the rest are context. */
    const ranked = settlements
      .map((settlement) => ({
        ...settlement,
        involvesYou:
          settlement.from === user.email || settlement.to === user.email,
      }))
      .sort(
        (a, b) =>
          Number(b.involvesYou) - Number(a.involvesYou) || b.cents - a.cents,
      )

    const total = totalSpentCents(expenses)

    const isCreator = group.members.some(
      (member) => member.email === user.email && member.isCreator,
    )

    return { group, expenses, nameOf, settlements: ranked, total, isCreator }
  }, [id, user.email, version])

  useDocumentTitle(
    data ? content.pageTitles.groupDetail(data.group.name) : content.app.name,
  )

  // Check readiness before trusting a `null` data result — storage.js's
  // cache starts empty, so without this a group that just hasn't synced yet
  // would flash "not found" instead of loading.
  if (!ready) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )
  }
  if (!data) return <NotFound />

  const { group, expenses, nameOf, settlements, total, isCreator } = data
  const pending = group.members.filter(
    (member) => member.status === 'pending',
  ).length

  function handleSave(values) {
    storage.createExpense({
      ...values,
      groupId: group.id,
      createdBy: user.email,
    })
    toast.success(copy.expenseAddedToast)
    setIsAdding(false)
  }

  function handleDeleteExpense(expenseId) {
    storage.deleteExpense(expenseId, user.email)
    toast.success(copy.expenseDeletedToast)
  }

  function handleSettleUp(settlement) {
    const pairKey = `${settlement.from}-${settlement.to}`
    if (settlingPairs.has(pairKey)) return
    setSettlingPairs((prev) => new Set(prev).add(pairKey))
    storage.recordSettlement({
      groupId: group.id,
      fromEmail: settlement.from,
      toEmail: settlement.to,
      amountCents: settlement.cents,
      recordedBy: user.email,
    })
    toast.success(copy.settlementRecordedToast)
  }

  function handleExportHistory() {
    downloadGroupHistory(group.id, group.name)
    toast.success(copy.historyExportedToast)
  }

  return (
    <AppShell>
      <Link
        to="/dashboard"
        className="text-sm text-ink-soft transition-colors hover:text-ink"
      >
        {copy.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">{group.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {copy.personCount(group.members.length)} ·{' '}
            <span className="num font-semibold">{formatMoney(total)}</span>{' '}
            {copy.spentInTotal}
          </p>
          {group.budgetCents != null ? (
            <div className="mt-3 max-w-xs">
              <BudgetBar
                spentCents={total}
                budgetCents={group.budgetCents}
                label={
                  total > group.budgetCents
                    ? copy.budgetOverBy(formatMoney(total - group.budgetCents))
                    : copy.budgetOfTotal(
                        formatMoney(total),
                        formatMoney(group.budgetCents),
                      )
                }
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isCreator ? (
            <Link
              to={`/group/${group.id}/settings`}
              aria-label={content.groupSettings.heading}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink-soft transition-colors hover:text-ink"
            >
              <Settings size={16} />
            </Link>
          ) : null}
          <span
            title={expenses.length === 0 ? copy.exportDisabledTitle : undefined}
          >
            <Button
              variant="secondary"
              onClick={handleExportHistory}
              disabled={expenses.length === 0}
              className="gap-2"
            >
              <Download size={16} />
              {copy.exportHistory}
            </Button>
          </span>
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <PlusCircle size={16} />
            {copy.addExpense}
          </Button>
        </div>
      </div>

      {/*
        Two-column below lg (1024px): expenses lead, wider, on the left;
        balance + members trail as a narrower supporting rail on the right.
        Below lg everything collapses to one column and simply stacks in
        source order — expenses, then balance, then members — so the DOM
        order below is the mobile reading order, not just an implementation
        detail.
      */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Expenses — the main focus */}
        <section>
          <h2 className="text-lg font-semibold text-ink">
            {copy.expensesHeading(expenses.length)}
          </h2>

          <div className="mt-4">
            {expenses.length === 0 ? (
              <EmptyState
                title={copy.emptyExpensesTitle}
                body={copy.emptyExpensesBody}
              >
                <Button
                  onClick={() => setIsAdding(true)}
                  variant="secondary"
                  className="gap-2"
                >
                  <PlusCircle size={16} />
                  {copy.addExpense}
                </Button>
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={{
                      ...expense,
                      amountCents: Math.round(expense.amount * 100),
                    }}
                    payerName={nameOf.get(expense.paidBy) ?? expense.paidBy}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Balance + members — supporting info, narrower */}
        <div className="flex flex-col gap-8 lg:sticky lg:top-20">
          {/* Settle up — the reason anyone opens this page. */}
          <section>
            <h2 className="text-lg font-semibold text-ink">
              {copy.settleHeading}
            </h2>

            <div className="mt-4">
              {settlements.length === 0 ? (
                <div className="rounded-card border border-line bg-surface px-5 py-8 text-center text-sm text-ink-muted">
                  {expenses.length === 0
                    ? copy.noExpensesYetBalance
                    : copy.allSquare}
                </div>
              ) : (
                <>
                  <ul className="flex flex-col gap-3">
                    {settlements.map((settlement) => {
                      const youPay = settlement.from === user.email
                      const youReceive = settlement.to === user.email
                      const fromName =
                        nameOf.get(settlement.from) ?? settlement.from
                      const toName = nameOf.get(settlement.to) ?? settlement.to

                      const involvesYou = youPay || youReceive

                      return (
                        <li
                          key={`${settlement.from}-${settlement.to}`}
                          className="flex flex-col gap-2"
                        >
                          <BalanceBar
                            cents={settlement.cents}
                            tone={
                              youPay ? 'debt' : youReceive ? 'credit' : 'other'
                            }
                            label={
                              youPay
                                ? copy.youOweLine(toName)
                                : youReceive
                                  ? copy.owesYouLine(fromName)
                                  : copy.othersOweLine(fromName, toName)
                            }
                          />
                          {involvesYou ? (
                            <Button
                              variant="secondary"
                              onClick={() => handleSettleUp(settlement)}
                              disabled={settlingPairs.has(
                                `${settlement.from}-${settlement.to}`,
                              )}
                              className="self-end"
                            >
                              {copy.settleUpButton}
                            </Button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-3 text-xs text-ink-muted">
                    {copy.paymentsClear(settlements.length)}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Members */}
          <section>
            <h2 className="text-lg font-semibold text-ink">
              {copy.membersHeading}
            </h2>
            <ul className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
              {group.members.map((member, index) => (
                <li
                  key={member.email}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    index > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <Avatar name={member.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {member.name}
                      {member.email === user.email ? (
                        <span className="ml-1.5 text-xs text-ink-muted">
                          {copy.you}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {member.email}
                    </p>
                  </div>
                  <StatusBadge status={member.status} />
                </li>
              ))}
            </ul>
            {pending > 0 ? (
              <p className="mt-3 text-xs text-ink-muted">
                {copy.pendingNotice}
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {isAdding ? (
        <AddExpenseModal
          group={group}
          currentEmail={user.email}
          onSave={handleSave}
          onClose={() => setIsAdding(false)}
        />
      ) : null}
    </AppShell>
  )
}
