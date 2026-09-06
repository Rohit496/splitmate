/**
 * The one and only place in Splitmate that talks to the backend. Groups and
 * expenses live in Supabase now (see supabaseClient.js) — nothing here touches
 * localStorage anymore.
 *
 * Reads are served from an in-memory cache kept in sync with Supabase, so
 * every exported function here stays synchronous, exactly like the old
 * localStorage version. `subscribe()`/`getVersion()` are unchanged: a
 * background fetch that lands new data calls `bump()`, which is exactly the
 * signal `useStoreVersion()` (via `useSyncExternalStore`) already re-renders
 * on — no other file had to change to pick up server data.
 *
 * Writes are optimistic: the cache is updated and `bump()`ed immediately (so
 * the UI reacts the instant a caller invokes createGroup/createExpense/
 * deleteExpense, same as before), and the real write happens in the
 * background. A failed write rolls the optimistic change back and logs it —
 * there's no call site left to `await` here to surface a toast for it.
 *
 * RLS on the Supabase side already guarantees a user only ever gets rows for
 * groups they belong to, so `listGroupsForEmail`/`listExpenses` filtering
 * here is a defensive belt-and-suspenders, not the actual security boundary.
 */

import { supabase } from './supabaseClient.js'
import { splitEqually, toCents } from '../utils/money.js'

/* ---------------------------------------------------------------- plumbing */

let version = 0
const listeners = new Set()

function bump() {
  version += 1
  listeners.forEach((fn) => fn())
}

/** Subscribe to any write. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Monotonic counter — the snapshot value for useSyncExternalStore. */
export function getVersion() {
  return version
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID()
  // RFC4122 v4 fallback for environments without crypto.randomUUID — still a
  // real UUID, since this goes straight into a Postgres `uuid` column.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

/** "priya.sharma@test.com" -> "Priya Sharma". Used for members who haven't registered yet. */
export function nameFromEmail(email) {
  const local = normalizeEmail(email).split('@')[0] || 'Member'
  return local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/* ------------------------------------------------------------- identity */

// Who's signed in right now, per AuthContext's upsertUserProfile() calls —
// storage.js needs this to stamp created_by/deleted_by (FKs to users.id) on
// writes, and to resolve the current user's own name/status without a query.
let currentUserId = null
let currentUserEmail = null
let currentUserName = null

/**
 * Called by AuthContext after every successful register/login/session
 * restore. Kicks off the initial data sync for whoever just signed in — the
 * one place storage.js learns "there's a session now, go fetch".
 */
export function upsertUserProfile({ id, name, email }) {
  currentUserId = id
  currentUserEmail = normalizeEmail(email)
  currentUserName = name || nameFromEmail(currentUserEmail)
  scheduleSync()
}

/* ------------------------------------------------------------------ cache */

let groupsCache = []
let expensesCache = []
let syncPromise = null

const GROUP_SELECT = `
  id, name, created_by, created_at,
  group_members ( email, user_id, added_at, users ( name ) )
`

const EXPENSE_SELECT = `
  id, group_id, description, amount, paid_by, participants, split_mode,
  category, date, created_by, created_at, is_deleted, deleted_at, deleted_by,
  expense_splits ( email, amount_cents )
`

function mapGroupRow(row) {
  const members = (row.group_members ?? []).map((m) => ({
    email: m.email,
    name: m.users?.name || nameFromEmail(m.email),
    userId: m.user_id,
    status: m.user_id ? 'active' : 'pending',
    isCreator: m.user_id != null && m.user_id === row.created_by,
    addedAt: m.added_at,
  }))
  // Insertion order isn't guaranteed back from Postgres; creator-first then
  // alphabetical gives a stable order close to the old array-order behavior.
  members.sort(
    (a, b) =>
      Number(b.isCreator) - Number(a.isCreator) ||
      a.email.localeCompare(b.email),
  )

  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    members,
  }
}

/** userId -> {email, name}, built from every member across every loaded group. */
function buildUserIndex(groups) {
  const index = new Map()
  for (const group of groups) {
    for (const member of group.members) {
      if (member.userId)
        index.set(member.userId, { email: member.email, name: member.name })
    }
  }
  if (currentUserId) {
    index.set(currentUserId, { email: currentUserEmail, name: currentUserName })
  }
  return index
}

function mapExpenseRow(row, userIndex) {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount), // numeric columns come back as strings over PostgREST
    paidBy: row.paid_by,
    participants: row.participants ?? [],
    splitMode: row.split_mode,
    splits: (row.expense_splits ?? []).map((s) => ({
      email: s.email,
      amountCents: s.amount_cents,
    })),
    category: row.category,
    date: row.date,
    createdBy: userIndex.get(row.created_by)?.email ?? row.created_by,
    createdAt: row.created_at,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at ?? undefined,
    deletedBy: row.deleted_by
      ? (userIndex.get(row.deleted_by)?.email ?? row.deleted_by)
      : undefined,
  }
}

async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select(GROUP_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapGroupRow)
}

async function fetchExpenses(userIndex) {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapExpenseRow(row, userIndex))
}

/**
 * Refetches groups + expenses for whoever's signed in and swaps the cache in
 * one go, then notifies subscribers. Concurrent callers share one in-flight
 * fetch instead of each firing their own.
 */
function scheduleSync() {
  if (!currentUserId) return Promise.resolve()
  if (!syncPromise) {
    syncPromise = performSync().finally(() => {
      syncPromise = null
    })
  }
  return syncPromise
}

async function performSync() {
  try {
    const groups = await fetchGroups()
    const expenses = await fetchExpenses(buildUserIndex(groups))
    groupsCache = groups
    expensesCache = expenses
  } catch (error) {
    // Keep serving the previous cache rather than wiping good data on a
    // transient failure (offline, RLS hiccup, etc.) — nothing here can
    // surface a toast, so at least don't make things worse.
    console.error('[storage] sync with Supabase failed', error)
  }
  bump()
}

/* ------------------------------------------------------------------- users */

export function listUsers() {
  const byEmail = new Map()
  if (currentUserId) {
    byEmail.set(currentUserEmail, {
      id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
    })
  }
  for (const group of groupsCache) {
    for (const member of group.members) {
      if (member.userId && !byEmail.has(member.email)) {
        byEmail.set(member.email, {
          id: member.userId,
          name: member.name,
          email: member.email,
        })
      }
    }
  }
  return [...byEmail.values()]
}

/**
 * Only ever resolves to yourself or someone you already share a group with —
 * RLS doesn't let this browser ask Supabase "does this arbitrary email have
 * an account" (that's deliberate: it would otherwise let anyone probe which
 * emails are registered). So an invite preview for a brand-new email shows
 * "pending" even if that person is registered; the real status resolves
 * correctly the moment the group actually exists, via getGroup()/link
 * triggers on the database side.
 */
export function getUserByEmail(email) {
  const target = normalizeEmail(email)
  if (target === currentUserEmail) {
    return { id: currentUserId, name: currentUserName, email: target }
  }
  for (const group of groupsCache) {
    const member = group.members.find((m) => m.email === target && m.userId)
    if (member) return { id: member.userId, name: member.name, email: target }
  }
  return null
}

/* ------------------------------------------------------------------ groups */

export function getGroup(groupId) {
  return groupsCache.find((group) => group.id === groupId) ?? null
}

/** Every group the given email belongs to, newest first. */
export function listGroupsForEmail(email) {
  const target = normalizeEmail(email)
  return groupsCache
    .filter((group) => group.members.some((member) => member.email === target))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * `memberEmails` may include the creator; duplicates are collapsed and the
 * creator is always a member. Returns the new group immediately (optimistic,
 * client-generated id) while the actual insert happens in the background —
 * CreateGroup.jsx navigates to `/group/${group.id}` right after calling this.
 */
export function createGroup({ name, creatorEmail, memberEmails = [] }) {
  const creator = normalizeEmail(creatorEmail)
  const emails = [creator, ...memberEmails.map(normalizeEmail)].filter(Boolean)
  const unique = [...new Set(emails)]
  const now = new Date().toISOString()
  const groupId = newId()

  const group = {
    id: groupId,
    name: String(name).trim(),
    createdBy: currentUserId,
    createdAt: now,
    members: unique
      .map((email) => {
        const known =
          email === currentUserEmail ? currentUserId : getUserByEmail(email)?.id
        return {
          email,
          name:
            email === currentUserEmail ? currentUserName : nameFromEmail(email),
          userId: known ?? null,
          status: known ? 'active' : 'pending',
          isCreator: email === creator,
          addedAt: now,
        }
      })
      .sort(
        (a, b) =>
          Number(b.isCreator) - Number(a.isCreator) ||
          a.email.localeCompare(b.email),
      ),
  }

  groupsCache = [group, ...groupsCache]
  bump()
  ;(async () => {
    try {
      const { error: groupError } = await supabase
        .from('groups')
        .insert({
          id: groupId,
          name: group.name,
          created_by: currentUserId,
          created_at: now,
        })
      if (groupError) throw groupError

      const memberRows = unique.map((email) => ({
        group_id: groupId,
        email,
        user_id: email === currentUserEmail ? currentUserId : null,
        added_at: now,
      }))
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberRows)
      if (membersError) throw membersError
    } catch (error) {
      console.error('[storage] createGroup failed, rolling back', error)
      groupsCache = groupsCache.filter((candidate) => candidate.id !== groupId)
      bump()
    } finally {
      scheduleSync()
    }
  })()

  return group
}

/* ---------------------------------------------------------------- expenses */

/** Live expenses for a group, newest first. Deleted records never come back. */
export function listExpenses(groupId) {
  return expensesCache
    .filter((expense) => expense.groupId === groupId && !expense.isDeleted)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
}

/** Equal shares over a fixed member list, ordered so the spare cents land predictably. */
function equalSplitsFor(emails, totalCents) {
  const ordered = [...emails].sort()
  const shares = splitEqually(totalCents, ordered.length)
  return ordered.map((email, index) => ({ email, amountCents: shares[index] }))
}

/**
 * `splits` carries one amount per person, in whole cents. Callers may omit it,
 * in which case the expense is split equally.
 *
 * Validation stays synchronous (throws immediately, same as before) since
 * it's pure computation; only the actual persistence is async and optimistic,
 * same pattern as createGroup.
 */
export function createExpense({
  groupId,
  description,
  amount,
  paidBy,
  participants,
  date,
  createdBy,
  splitMode = 'equal',
  splits,
  category = 'Other',
}) {
  const totalCents = toCents(amount)
  const emails = participants.map(normalizeEmail)

  const resolved = splits
    ? splits.map((split) => ({
        email: normalizeEmail(split.email),
        amountCents: Math.round(split.amountCents),
      }))
    : equalSplitsFor(emails, totalCents)

  /* Shares that don't add up to the total would stop a group's balances summing
     to zero, which makes every settlement derived from them wrong. Refuse the
     write rather than store a record that can corrupt the whole group. */
  const assigned = resolved.reduce((sum, split) => sum + split.amountCents, 0)
  if (assigned !== totalCents) {
    throw new Error(
      `Expense splits must add up to the total (got ${assigned} of ${totalCents} cents).`,
    )
  }

  const id = newId()
  const now = new Date().toISOString()
  const record = {
    id,
    groupId,
    description: String(description).trim(),
    amount: Number(amount),
    paidBy: normalizeEmail(paidBy),
    participants: emails,
    splitMode,
    splits: resolved,
    category: String(category ?? '').trim() || 'Other',
    date,
    createdBy: normalizeEmail(createdBy),
    createdAt: now,
    isDeleted: false,
  }

  expensesCache = [record, ...expensesCache]
  bump()
  ;(async () => {
    try {
      const { error: expenseError } = await supabase.from('expenses').insert({
        id,
        group_id: groupId,
        description: record.description,
        amount: record.amount,
        paid_by: record.paidBy,
        participants: emails,
        split_mode: splitMode,
        category: record.category,
        date,
        created_by: currentUserId,
        created_at: now,
        is_deleted: false,
      })
      if (expenseError) throw expenseError

      const splitRows = resolved.map((split) => ({
        expense_id: id,
        email: split.email,
        amount_cents: split.amountCents,
      }))
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitRows)
      if (splitsError) throw splitsError
    } catch (error) {
      console.error('[storage] createExpense failed, rolling back', error)
      expensesCache = expensesCache.filter((candidate) => candidate.id !== id)
      bump()
    } finally {
      scheduleSync()
    }
  })()

  return record
}

/**
 * Soft delete: the record stays, flagged. Balances are always recomputed from
 * the surviving expenses, so removing one can never leave a stale total behind.
 */
export function deleteExpense(expenseId, deletedBy) {
  const now = new Date().toISOString()
  const deletedByEmail = normalizeEmail(deletedBy)
  const previous = expensesCache

  expensesCache = expensesCache.map((expense) =>
    expense.id === expenseId
      ? {
          ...expense,
          isDeleted: true,
          deletedAt: now,
          deletedBy: deletedByEmail,
        }
      : expense,
  )
  bump()
  ;(async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          is_deleted: true,
          deleted_at: now,
          deleted_by: currentUserId,
        })
        .eq('id', expenseId)
      if (error) throw error
    } catch (error) {
      console.error('[storage] deleteExpense failed, rolling back', error)
      expensesCache = previous
      bump()
    } finally {
      scheduleSync()
    }
  })()
}
