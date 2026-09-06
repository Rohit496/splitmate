/**
 * Balance math for a group.
 *
 * Nothing is ever stored: balances are recomputed from the surviving expenses
 * every time they are read, so a soft-deleted expense simply stops counting.
 */

import { splitEqually, toCents } from './money.js'

/**
 * Per-person shares for one expense, in cents.
 *
 * Expenses saved before unequal splitting existed carry no `splits`, so they
 * fall back to an equal division across their participants — exactly what the
 * app has always computed for them.
 */
export function expenseShares(expense) {
  if (Array.isArray(expense.splits) && expense.splits.length > 0) {
    return expense.splits.map((split) => ({
      email: split.email,
      cents: Math.round(split.amountCents),
    }))
  }

  const participants = [...expense.participants].sort()
  if (participants.length === 0) return []

  const shares = splitEqually(toCents(expense.amount), participants.length)
  return participants.map((email, index) => ({ email, cents: shares[index] }))
}

/**
 * Net position per member, in cents.
 *   positive -> the group owes them
 *   negative -> they owe the group
 * The values always sum to zero.
 *
 * `settlements` are recorded payments that offset a debt exactly like a
 * payment would: the payer's net position rises (their debt shrinks) and the
 * receiver's falls (they've already been paid, so they're owed less).
 * Optional, defaults to `[]` so any call site that hasn't been updated yet
 * still works.
 */
export function netBalances(memberEmails, expenses, settlements = []) {
  const net = new Map(memberEmails.map((email) => [email, 0]))
  const add = (email, cents) => net.set(email, (net.get(email) ?? 0) + cents)

  for (const expense of expenses) {
    if (expense.isDeleted) continue

    const shares = expenseShares(expense)
    if (shares.length === 0) continue

    const totalCents = toCents(expense.amount)
    add(expense.paidBy, totalCents)

    let assigned = 0
    for (const share of shares) {
      add(share.email, -share.cents)
      assigned += share.cents
    }

    /* Storage rejects splits that don't add up, so this should never fire. If a
       record slips through anyway, the payer absorbs the difference — that keeps
       the balances summing to zero instead of letting one bad row make every
       settlement in the group wrong. */
    const residual = totalCents - assigned
    if (residual !== 0) add(expense.paidBy, -residual)
  }

  for (const settlement of settlements) {
    add(settlement.fromEmail, settlement.amountCents)
    add(settlement.toEmail, -settlement.amountCents)
  }

  return net
}

/**
 * Collapses every debt in the group into the fewest transfers that clear it.
 *
 * Two people who each paid for something don't need to pay each other twice —
 * only the difference moves. Repeatedly matching the largest debtor against the
 * largest creditor settles n members in at most n-1 payments.
 */
export function simplifySettlements(net) {
  const creditors = []
  const debtors = []

  for (const [email, cents] of net) {
    if (cents > 0) creditors.push({ email, cents })
    else if (cents < 0) debtors.push({ email, cents: -cents })
  }

  const bySize = (a, b) => b.cents - a.cents || a.email.localeCompare(b.email)
  creditors.sort(bySize)
  debtors.sort(bySize)

  const settlements = []
  let d = 0
  let c = 0

  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].cents, creditors[c].cents)
    if (amount > 0) {
      settlements.push({
        from: debtors[d].email,
        to: creditors[c].email,
        cents: amount,
      })
    }
    debtors[d].cents -= amount
    creditors[c].cents -= amount
    if (debtors[d].cents === 0) d += 1
    if (creditors[c].cents === 0) c += 1
  }

  return settlements
}

/** Everything a group view needs: each member's net, plus the transfers to settle. */
export function groupBalances(memberEmails, expenses, settlements = []) {
  const net = netBalances(memberEmails, expenses, settlements)
  return { net, settlements: simplifySettlements(net) }
}

/** One member's net position in a group, in cents. */
export function balanceFor(email, memberEmails, expenses, settlements = []) {
  return netBalances(memberEmails, expenses, settlements).get(email) ?? 0
}

/**
 * Rolls a person's per-group balances into the three dashboard figures.
 * `owed` and `owe` are both positive; `net` is owed - owe.
 */
export function totalsFor(balances) {
  let owed = 0
  let owe = 0
  for (const cents of balances) {
    if (cents > 0) owed += cents
    else owe += -cents
  }
  return { owed, owe, net: owed - owe }
}
