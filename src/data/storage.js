/**
 * The one and only place in Splitmate that touches localStorage.
 *
 * Everything else in the app — pages, components, contexts — goes through the
 * functions exported here. When this moves to Supabase, this file is the only
 * one that has to change.
 *
 * Records are stored as plain JSON arrays under a handful of namespaced keys.
 * Passwords are kept in plain text on purpose: this is local-only test data.
 */

import { splitEqually, toCents } from '../utils/money.js'

const KEYS = {
  users: 'splitmate.users',
  groups: 'splitmate.groups',
  expenses: 'splitmate.expenses',
  session: 'splitmate.session',
}

/* ---------------------------------------------------------------- plumbing */

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    // Corrupted or unavailable storage shouldn't take the app down.
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or private-mode failures: the in-memory result still stands.
  }
  bump()
}

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

if (typeof window !== 'undefined') {
  // Keep other tabs of the same browser in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === null || Object.values(KEYS).includes(event.key)) bump()
  })
}

function newId(prefix) {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${uuid}`
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
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

/* -------------------------------------------------------------------- seed */

const SEED_USERS = [
  { name: 'Shubham', email: 'shubham@test.com' },
  { name: 'Bob', email: 'bob@test.com' },
  { name: 'Rahul', email: 'rahul@test.com' },
  { name: 'Eva', email: 'eva@test.com' },
]

/** Creates the four test accounts the first time the app runs in this browser. */
function seed() {
  if (window.localStorage.getItem(KEYS.users) !== null) return
  const now = new Date().toISOString()
  write(
    KEYS.users,
    SEED_USERS.map((user) => ({
      id: newId('usr'),
      name: user.name,
      email: user.email,
      password: 'password',
      createdAt: now,
    })),
  )
}

if (typeof window !== 'undefined') seed()

/* ------------------------------------------------------------------- users */

export function listUsers() {
  return read(KEYS.users, [])
}

/** Returns the stored record, password included — only AuthContext should need that. */
export function getUserByEmail(email) {
  const target = normalizeEmail(email)
  return listUsers().find((user) => user.email === target) ?? null
}

export function getUserById(id) {
  if (!id) return null
  return listUsers().find((user) => user.id === id) ?? null
}

export function createUser({ name, email, password }) {
  const users = listUsers()
  const record = {
    id: newId('usr'),
    name: String(name).trim(),
    email: normalizeEmail(email),
    password,
    createdAt: new Date().toISOString(),
  }
  write(KEYS.users, [...users, record])
  return record
}

/* ----------------------------------------------------------------- session */

export function getSessionUserId() {
  return read(KEYS.session, null)
}

export function setSessionUserId(userId) {
  write(KEYS.session, userId)
}

export function clearSession() {
  write(KEYS.session, null)
}

/* ------------------------------------------------------------------ groups */

function readGroups() {
  return read(KEYS.groups, [])
}

/**
 * Members are stored by email, which is the one identifier that exists whether
 * or not someone has registered. Name and active/pending status are resolved at
 * read time, so a pending member turns active the moment they sign up.
 */
function resolveMembers(group) {
  const users = listUsers()
  return group.members.map((member) => {
    const user = users.find((candidate) => candidate.email === member.email)
    return {
      email: member.email,
      name: user ? user.name : nameFromEmail(member.email),
      userId: user ? user.id : null,
      status: user ? 'active' : 'pending',
      isCreator: member.email === group.createdBy,
    }
  })
}

function resolveGroup(group) {
  return { ...group, members: resolveMembers(group) }
}

export function getGroup(groupId) {
  const group = readGroups().find((candidate) => candidate.id === groupId)
  return group ? resolveGroup(group) : null
}

/** Every group the given email belongs to, newest first. */
export function listGroupsForEmail(email) {
  const target = normalizeEmail(email)
  return readGroups()
    .filter((group) => group.members.some((member) => member.email === target))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(resolveGroup)
}

/**
 * `memberEmails` may include the creator; duplicates are collapsed and the
 * creator is always a member.
 */
export function createGroup({ name, creatorEmail, memberEmails = [] }) {
  const creator = normalizeEmail(creatorEmail)
  const emails = [creator, ...memberEmails.map(normalizeEmail)].filter(Boolean)
  const unique = [...new Set(emails)]
  const now = new Date().toISOString()

  const group = {
    id: newId('grp'),
    name: String(name).trim(),
    createdBy: creator,
    createdAt: now,
    members: unique.map((email) => ({ email, addedAt: now })),
  }

  write(KEYS.groups, [...readGroups(), group])
  return resolveGroup(group)
}

/* ---------------------------------------------------------------- expenses */

function readExpenses() {
  return read(KEYS.expenses, [])
}

/**
 * Live expenses for a group, newest first. Soft-deleted records are filtered
 * out here so no caller has to remember to do it.
 */
export function listExpenses(groupId) {
  return readExpenses()
    .filter((expense) => expense.groupId === groupId && !expense.isDeleted)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
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
 * Equal splits are written out just like manual ones, so every record carries
 * its own per-person amounts and the balance code has a single path to read.
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

  const record = {
    id: newId('exp'),
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
    createdAt: new Date().toISOString(),
    isDeleted: false,
  }
  write(KEYS.expenses, [...readExpenses(), record])
  return record
}

/**
 * Soft delete: the record stays, flagged. Balances are always recomputed from
 * the surviving expenses, so removing one can never leave a stale total behind.
 */
export function deleteExpense(expenseId, deletedBy) {
  const next = readExpenses().map((expense) =>
    expense.id === expenseId
      ? {
          ...expense,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: normalizeEmail(deletedBy),
        }
      : expense,
  )
  write(KEYS.expenses, next)
}
