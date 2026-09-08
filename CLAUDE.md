# Splitmate

An expense-splitting app (think Splitwise): create a group, add shared
expenses, and see the fewest payments needed to settle up. Backed by
Supabase (Postgres + Auth) — groups, expenses, and accounts are real rows
behind Row Level Security, not local-only data. `src/data/storage.js` and
`src/context/AuthContext.jsx` are the only two modules that talk to Supabase;
every other file is unchanged from the original local-only design and doesn't
know the backend exists.

## Tech stack

- **React 19** + **React Router 7** (`BrowserRouter`, client-side routing only)
- **Vite 8** (`@vitejs/plugin-react`) — dev server and build
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; all
  design tokens live in the `@theme` block in `src/index.css`
- **Supabase** (`@supabase/supabase-js`) — Postgres (groups/expenses) + Auth
  (accounts/sessions). One client in `src/data/supabaseClient.js`.
- **react-toastify** for toast notifications
- **lucide-react** for icons
- No test runner, no TypeScript, no state library (React context + `useSyncExternalStore` cover it)
- `.prettierrc` (`{semi: false, singleQuote: true}`) — needed so the
  PostToolUse auto-format hook matches the codebase's actual style instead of
  falling back to Prettier's defaults (double quotes, semicolons)

Scripts: `npm run dev`, `npm run build`, `npm run preview`.

## Folder structure

```
src/
  main.jsx              # entry: StrictMode > BrowserRouter > App
  App.jsx               # routes + ToastContainer, sets the <meta description>
                         # tag (each page sets its own document title — see
                         # Key conventions)
  constant.js            # ALL user-facing copy — see Conventions
  index.css             # Tailwind v4 @theme tokens + base layer
  toast-theme.css        # overrides react-toastify's palette to match app tokens

  pages/                # one component per route (see Routes below)
  components/           # shared UI: AppShell, AccountMenu (navbar identity
                         # dropdown), ThemeToggle (navbar dark/light button),
                         # AuthLayout, modals, BudgetBar, ui.jsx primitives
  context/AuthContext.jsx  # Supabase Auth state + register/login/logout/
                           # requestPasswordReset/updatePassword/updateName/
                           # updateEmail/updateMobile/changePassword/
                           # updatePhoto/removePhoto
  context/ThemeContext.jsx # light/dark theme: toggles a `dark` class on
                           # <html>, persisted in localStorage — see Key
                           # conventions
  data/supabaseClient.js # the one Supabase client (auth.* + from(...) tables)
  data/storage.js        # the ONLY module that reads/writes groups & expenses —
                          # Supabase-backed now, no localStorage left at all
  hooks/useStore.js      # useSyncExternalStore wrappers: useStoreVersion()
                         # (re-render on any write) + useStoreReady() (has the
                         # current session's first sync completed — see Key
                         # conventions)
  hooks/useDocumentTitle.js # sets document.title for as long as the calling
                         # page is mounted — see Key conventions
  utils/money.js         # cents<->dollars, formatting, date helpers,
                         # totalSpentCents(expenses) (total group spend)
  utils/balances.js      # net balances + debt-simplification algorithm
  utils/groupExport.js   # CSV export of one group's expense history
  utils/monthlyReport.js # aggregates a user's expenses across every group they're
                         # in into the Reports page's filtered rows/totals/chart/
                         # by-category shapes — derived only, nothing stored
  utils/csvExport.js     # builds + downloads the Reports page's CSV (multi-group
                         # superset of groupExport.js's per-group export; duplicates
                         # rather than shares its CSV-escaping helpers — see Known issues)
```

No `supabase/` directory in this repo — the schema (tables, triggers, RLS
policies) lives only in the remote Supabase project, applied directly via the
Supabase MCP tools (`apply_migration`). There are no local `.sql` migration
files to check for schema history; if you need it, query the live project.

`specs/` holds feature specs written before implementation (e.g.
`specs/reports.md`) — not binding once built, but useful context for why a
feature is shaped the way it is; check there before assuming an omission is
accidental.

## Data models

Backed by Supabase now (Postgres tables + Auth), but `storage.js` returns the
exact same JS shapes it always did — field names below are what every page/
component actually sees; the Postgres columns underneath are noted separately.
Reads are served from an in-memory cache kept in sync with Supabase in the
background (`bump()`/`subscribe()`/`useStoreVersion()` are unchanged from the
original design); writes are optimistic (client-generated UUID, immediate
cache update, background persist, rollback + `console.error` on failure —
there's no call site left that awaits these, so a failed write has no toast).

**User** — no localStorage mirror anymore. `getUserByEmail()`/`listUsers()`
resolve only from the in-memory cache, and only from a group the _current_
signed-in user (`currentUserEmail`) is actually a member of — yourself, or
anyone you already share a group with, checked explicitly inside both
functions rather than assumed from the cache's contents (see the shared-cache
convention below). Supabase RLS also won't let this browser ask "does this
arbitrary email have an account" for anyone else (deliberate anti-enumeration
boundary). Postgres: `public.users` (`id` = same UUID as `auth.users.id`,
`name`, `email`, `created_at`, `avatar_path` nullable, `mobile` nullable),
one row per account, created automatically by a trigger on `auth.users`
insert. No password column — Supabase Auth owns credentials.

**Profile** (`/profile`, see Routes) lets the signed-in user manage their own
`name` (edited as separate First/Last name inputs, still stored as one
string), `mobile` (freeform, optional), a photo, and — reversing the
original spec's read-only design — their `email`. Photo and email both work
differently from every other write in this app:

- **Photo** uploads to the public `avatars` Storage bucket under
  `{userId}/{uuid}.{ext}`, storing the path in both `public.users.avatar_path`
  (canonical, cross-user-visible) and Auth user metadata (`avatar_path`,
  read by `toPublicUser` to drive `user.avatarUrl` reactively). `mapGroupRow`
  now also derives `avatarUrl` per member from `avatar_path` threaded through
  `GROUP_SELECT`'s `users ( name, avatar_path )` sub-select, so co-members'
  photos show in `GroupDetail`/`GroupSettings` member lists too, not just
  the owner's own navbar.
- **Email** goes through Supabase's real double-confirmation flow
  (`AuthContext.updateEmail` only calls `supabase.auth.updateUser({ email })`
  — `auth.users.email` doesn't actually change until the user confirms from
  their inbox, so nothing here is optimistic). Because `expenses.paid_by`,
  `expenses.participants`, `expense_splits.email`, `settlements.from_email`/
  `to_email`, and `group_members.email` are all keyed by email as plain text
  rather than user id, a `cascade_email_change()` trigger on `auth.users`
  (`AFTER UPDATE OF email`, fires only once the change is actually confirmed)
  renames the email across every one of those tables so history never
  orphans. `EXECUTE` on that trigger function is revoked from
  `anon`/`authenticated` (it can't do anything outside real trigger context
  anyway, since it reads `NEW`/`OLD`, but revoking matches the fix documented
  below for this exact `SECURITY DEFINER` pattern).

**Group**

```
{ id, name, createdBy, createdAt, budgetCents, members: [{ email, name, userId, status: 'active'|'pending', isCreator, addedAt, avatarUrl }] }
```

Postgres: `public.groups` (`id`, `name`, `created_by` uuid → `users.id`,
`created_at`, `budget_cents` integer nullable, `check (budget_cents is null
or budget_cents > 0)`) + `public.group_members` (`group_id`, `email`,
`user_id` nullable, `added_at`). Members are still keyed by **email** (not
just `user_id`) so inviting someone who hasn't registered yet works, same as
before. Two DB triggers keep pending → active resolution live in both
temporal directions: `link_group_members_on_signup` (fires on new
`auth.users`, links any pending `group_members` rows with a matching email)
and `link_new_group_member` (fires BEFORE INSERT on `group_members`, links to
an already-existing account) — inviting someone before or after they sign up
both resolve correctly, with nothing to migrate.

`budgetCents` (optional total trip budget, set/edited/cleared only by the
creator in `GroupSettings.jsx`) is shown as a `BudgetBar` progress indicator
(`src/components/BudgetBar.jsx`, 3-state tone: comfortable/near/over) on both
`Dashboard.jsx` and `GroupDetail.jsx`, comparing it against
`utils/money.js`'s `totalSpentCents(expenses)` — total group spend, never
netted against settlements or per-person shares. `updateGroupBudget(groupId,
budgetCents)` in `storage.js` reuses the `groups_update_creator` RLS policy
(table-level, already covers any column on `groups`) — `budgetCents: null`
clears it.

`addMember(groupId, email)` (creator-only, `GroupSettings.jsx`) inserts a new
`group_members` row only — never touches `expenses`/`expense_splits`/
`settlements`, so a newly added member starts with zero history. Active vs.
pending isn't decided client-side (RLS's anti-enumeration boundary means
`getUserByEmail` can't reliably tell whether an arbitrary stranger is already
registered) — the existing `link_new_group_member` trigger resolves it
authoritatively at insert time, same as `createGroup`'s own invites.

`renameGroup(groupId, name)` and `removeMember(groupId, email)` live in
`storage.js` too, both creator-only. Rename reuses the existing
`groups_update_creator` policy. Removing a member is blocked — both
client-side (a synchronous check against the cached expense list, no round
trip) and by a `BEFORE DELETE` trigger on `group_members`
(`prevent_member_removal_with_expenses`) — if that email appears as `paid_by`
or in any `expense_splits` row for a non-deleted expense in that group; the
required error text is exactly `"Cannot remove — member has existing
expenses."` This trigger fires even when `group_members` rows are deleted as
a _cascade_ from deleting the `groups` row itself (e.g. wiping a whole test
group), not just on an explicit member removal — `DELETE FROM groups` alone
fails with that same error if any member has expenses. To actually delete a
group with expense history, delete in this order: `expenses` (cascades to
`expense_splits`), `settlements`, then `group_members`, then `groups`. DELETE
on `group_members` is otherwise restricted to the creator
via `group_members_delete_creator` (reuses the `is_group_creator` helper).
This creator/"admin" check is the app's only elevated-permission concept so
far — `GroupSettings.jsx` gates its whole page on `member.isCreator`,
redirecting anyone else back to `/group/:id`; extend this same pattern
(client-side redirect + an RLS policy keyed off `is_group_creator`) for any
future admin-only action.

**Settlement** — records that a debt was actually paid, so it stops counting
as owed.

```
{ id, groupId, fromEmail, toEmail, amountCents, recordedBy (email), createdAt }
```

Postgres: `public.settlements` (`group_id` → `groups.id` cascade,
`from_email`, `to_email`, `amount_cents` `check > 0`, `created_by` uuid →
`users.id`, `created_at`). RLS: SELECT for any group member, INSERT only as
yourself (`created_by = auth.uid()`) — no UPDATE or DELETE policy at all,
same permanent-history philosophy as `expenses`. `listSettlements(groupId)` /
`recordSettlement({...})` in `storage.js` follow the exact optimistic-write
pattern as `createExpense`/`deleteExpense`.

`utils/balances.js`'s `netBalances`/`groupBalances`/`balanceFor` take an
optional third `settlements` argument — each settlement offsets its pair's
net position exactly like a payment would (payer's net increases, receiver's
decreases), computed fresh on every read same as expense-driven balances.
Both `GroupDetail.jsx` and `Dashboard.jsx` pass this through, so recording a
settlement removes it from a group's "Settle up" list _and_ reduces the
Dashboard's headline figures.

**Expense**

```
{
  id, groupId, description, amount (dollars, Number),
  paidBy (email), participants: [email],
  splitMode: 'equal' | 'manual',
  splits: [{ email, amountCents }],   // always written out explicitly, even for equal splits
  category (string, defaults to 'Other'),
  date (YYYY-MM-DD), createdBy (email), createdAt,
  isDeleted (bool), deletedAt?, deletedBy?,
}
```

Postgres: `public.expenses` (`amount` is `numeric(12,2)` — comes back from
PostgREST as a **string**, cast with `Number(...)` in `storage.js`'s row
mapper; `created_by`/`deleted_by` are `uuid` → `users.id`, resolved back to an
email in the JS shape via an in-memory `userId -> email` index) +
`public.expense_splits` (`expense_id`, `email`, `amount_cents`), one row per
entry in `splits`.

- Deletes are **soft**: `deleteExpense` just flags `isDeleted` (`is_deleted`
  in Postgres); `listExpenses` filters deleted rows out both in the query
  (`.eq('is_deleted', false)`) and again client-side. Nothing is ever
  hard-removed — there's no DELETE RLS policy on `expenses` at all, so a hard
  delete is refused at the database level even if some future code tried.
- `createExpense` **throws** if `splits` don't sum to `amount` in cents —
  this check stays fully synchronous (pure computation, no network) and is
  the one integrity check protecting every balance calculation downstream.
- Balances (`utils/balances.js`) are never stored — they're recomputed from
  the live expense list on every read, so a delete or edit can never leave a
  stale total behind.

**Session**: Supabase Auth's session (JWT), not app-controlled — persisted by
`supabase-js` under a `sb-<project-ref>-auth-token` key in `localStorage`
(the one remaining `localStorage` use in the app, and it's Supabase's, not
ours). `AuthContext` mirrors it into `{ id, name, email, mobile, joinedAt,
avatarPath, avatarUrl }` via `useAuth()` — extended for the Profile page (see
Routes); `avatarPath` (the raw Storage object path) isn't part of the
documented shape used elsewhere, it's read internally by
`updatePhoto`/`removePhoto` to best-effort delete the previous photo.

**Row Level Security is the real security boundary.** Every table
(`users`, `groups`, `group_members`, `expenses`, `expense_splits`,
`settlements`) has RLS
enabled, scoped to "rows for groups the current `auth.uid()` belongs to" —
`storage.js`'s own email/groupId filtering on top of that is defensive, not
the actual boundary. `anon` has zero grants on any of these tables; nothing
works without a real session.

## Routes (`src/App.jsx`)

| Path                  | Page             | Auth                           |
| --------------------- | ---------------- | ------------------------------ |
| `/`                   | `Landing`        | public                         |
| `/login`              | `Login`          | public                         |
| `/register`           | `Register`       | public                         |
| `/forgot-password`    | `ForgotPassword` | public                         |
| `/reset-password`     | `ResetPassword`  | public                         |
| `/dashboard`          | `Dashboard`      | `RequireAuth`                  |
| `/reports`            | `Reports`        | `RequireAuth`                  |
| `/profile`            | `Profile`        | `RequireAuth`                  |
| `/group/new`          | `CreateGroup`    | `RequireAuth`                  |
| `/group/:id`          | `GroupDetail`    | `RequireAuth`                  |
| `/group/:id/settings` | `GroupSettings`  | `RequireAuth` (+ creator-only) |
| `*`                   | redirect to `/`  | —                              |

`RequireAuth` redirects to `/login` (preserving the intended path in router
state) when `useAuth().isAuthenticated` is false.

`/group/:id/settings` is creator-only, enforced _inside_ `GroupSettings.jsx`
(not by a separate guard component): not-a-member/nonexistent group renders
the same "not found" `EmptyState` `GroupDetail.jsx` uses; a member who isn't
the creator gets `<Navigate to={`/group/${id}`} replace />` instead of an
error page.

`/reset-password` is public but only functional when reached from the emailed
"forgot password" link: `supabaseClient.js` has `detectSessionInUrl: true`
specifically so that link's token turns into a real (short-lived,
single-purpose) session automatically. Visiting it directly with no valid
token still renders the form; submitting shows
`content.auth.resetLinkExpiredError` instead of crashing.

`/reports` is a signed-in user's expense history across _every_ group they
belong to — filterable by date range/group/category, a spending-over-time
bar chart, a by-category breakdown, and a CSV export — reached via the
`AccountMenu` dropdown (see below), not a standalone nav link anymore. It
complements Dashboard rather than replacing anything on it: Dashboard answers
"who owes whom right now" (balances, netted against settlements); Reports
answers "what did I spend, and when" and deliberately has **no balance/
settle-up math and no settlements** — it's a spend record, not a ledger of
debts. Nothing here is a new data model: `utils/monthlyReport.js` derives
everything (`buildMonthlyReport`) from `storage.listGroupsForEmail` and
`storage.listExpenses` plus `utils/balances.js`'s `expenseShares`, same
"recomputed on every read" philosophy as `utils/balances.js` itself, keyed on
`useStoreVersion()` for reactivity like every other page. See
`specs/reports.md` for the full spec this was built from.

`/profile` is the account-settings counterpart to `GroupSettings` — scoped to
the signed-in user instead of a group, same visual language and form
patterns. One "Personal details" card holds photo (with its own immediate
Change/Remove actions — a file picker doesn't defer to a later Save), and a
single form with First/Last name, email, and mobile number sharing **one**
Save button: each field only writes if it actually changed, so editing your
name doesn't also fire an email-change request. "Change password" is a
separate card — it re-authenticates with the current password first
(`supabase.auth.signInWithPassword` as a pure check, no navigation), which
none of the other saves need. See specs/profile.md — built per spec except
email being editable (a deliberate, requested reversal of that spec's
original read-only design; see Data models → Profile) and Photo/Email/Name/
Mobile being one merged section instead of separate ones.

The signed-in identity in `AppShell`'s navbar is `AccountMenu`
(`src/components/AccountMenu.jsx`) — a single dropdown (avatar + name +
chevron) containing Profile, Reports, a divider, and Sign out, replacing what
used to be a separate Reports link + identity link + Sign-out button.
`ThemeToggle` (`src/components/ThemeToggle.jsx`) sits immediately to
`AccountMenu`'s left in the navbar — a standalone icon-only button, not part
of the dropdown itself; see Key conventions → "Light/dark theme..." for how
the toggle works.
Click-outside and Escape both close it (focus returns to the trigger on
Escape); no shadow on the panel (DESIGN.md's flat-by-default rule) — an
opaque `bg-surface` card with a border is what reads as "above" the page
here, same as every other card in the app.

The spending-over-time chart (`SpendingChart` in `Reports.jsx`, a hand-rolled
inline SVG) is horizontally scrollable once its bars don't fit, shows each
bucket's total in a fixed row above the bars (not hugging each bar's own
peak, so a short bar's label never collides with a tall neighbor's), and has
a custom on-brand hover/focus tooltip in addition to each bar's native
`<title>`. `buildChartBuckets` in `monthlyReport.js` never returns an empty
array — with no rows to bucket (a fresh account, or a filter combination
that matches nothing) it falls back to `emptyTrailingBuckets()`, a trailing
6-calendar-month range at $0, so the chart keeps its shape instead of
vanishing; `Reports.jsx` renders that fallback chart above the "no expenses
match these filters" empty state rather than hiding the chart section.
Two CSS gotchas the chart's positioning code works around, worth knowing
before touching it again: the wrapper's `overflow-x-auto` makes the browser
compute `overflow-y` as `auto` too (the CSS overflow spec ties the two axes
together whenever only one is `visible`), so anything positioned above `y=0`
inside it is silently clipped — that's why the tooltip anchors just below
the total-label row instead of at each bar's own peak; and the `<svg>` needs
`preserveAspectRatio="xMinYMid meet"`, because without it the default
center alignment shifts the whole coordinate system sideways whenever
`min-w-full` stretches the SVG wider than its natural content (few-bucket
case), which breaks any pixel-based overlay positioned on top of it.

## Key conventions

**Centralized copy.** Every piece of user-facing text — labels, placeholders,
button text, errors, toasts, aria-labels — lives in `src/constant.js`, grouped
by feature (`content.login`, `content.groupDetail`, `content.addExpenseModal`,
etc.). Components import `content` and never hardcode a string. Entries that
depend on a count or interpolated value are **functions**, not strings — e.g.
`copy.personCount(count)`, `copy.removeAria(name)` — call them, don't template
around them. When adding a feature with new UI text, add the copy to
`constant.js` first, then reference it — do not inline text in a component.

**Per-route document titles.** Every route sets its own browser tab title by
calling `useDocumentTitle(title)` (`src/hooks/useDocumentTitle.js`) at the
top of the page component, before any early return — required so it still
runs on pages that can bail out early (`GroupDetail`, `GroupSettings`,
`Landing`'s authenticated-redirect). Titles live in `content.pageTitles`;
entries that need a dynamic value are functions, same convention as the rest
of `constant.js` (`groupDetail(name)` interpolates the group's own name,
falling back to `content.app.name` while the group is loading or not found).
`App.jsx`'s mount effect no longer sets `document.title` itself — it used to,
but React fires child effects before parent effects, so that effect always
ran _after_ every page's own `useDocumentTitle` and clobbered it back to the
bare app name on every navigation; it now only updates the `<meta
description>` tag.

**Money in integer cents.** All arithmetic goes through `utils/money.js`
(`toCents`, `splitEqually`, `formatMoney`). Never do float math on dollar
amounts directly — floating point loses cents when splitting unevenly.
`splitEqually` hands any remainder cents to the first participants in a
**stable sort order**, so callers must pass participants pre-sorted (usually
by email) for reproducible results.

**Storage is the only data boundary.** Pages and components never call
Supabase directly — everything goes through `src/data/storage.js` (and, for
auth, `useAuth()`/`AuthContext.jsx`). Every write updates the in-memory cache
and calls `bump()`, which increments a version counter that
`useStoreVersion()` (via `useSyncExternalStore`) subscribes to, so any
component reading storage inside a `useMemo` keyed on that version re-renders
automatically after a write anywhere in the app. There is currently **no
cross-tab/cross-device live sync** — the old `storage` event listener doesn't
apply anymore (data isn't in `localStorage`), and no Supabase Realtime
subscription has replaced it. A second tab/device only sees a change after
its own next login or write-triggered resync.

**The shared cache is a module-level singleton — it isn't cleared on
logout.** `groupsCache`/`expensesCache`/`settlementsCache` only get fully
replaced by the _next_ login's resync, so for one browser tab's brief window
between a logout and a different user's next login, they can still hold the
previous user's data. Any function that scans these caches for data scoped to
"the current user" must explicitly verify `currentUserEmail` is actually a
member of the group a match came from — never trust that everything sitting
in the cache already belongs to whoever's currently signed in.
`getUserByEmail`/`listUsers` were missing this check and got fixed in a
security audit (they now skip any group `currentUserEmail` isn't in before
considering its members); `GroupDetail.jsx`/`GroupSettings.jsx` already had
the equivalent page-level check. Follow the same pattern in anything new that
reads these caches.

**`login`/`register`/`requestPasswordReset`/`updatePassword` are `async`**
(real network calls now, not synchronous `localStorage` reads) — callers must
`await` them. `logout()` stays synchronous by design: it clears local state
immediately, then fires `supabase.auth.signOut()` in the background, so a
caller that navigates right away (`AppShell` does) doesn't race a
still-"authenticated" render. `createGroup`/`createExpense`/`deleteExpense`
also stay fully synchronous from the caller's perspective (optimistic
cache update returned immediately; the real Supabase write happens after, in
the background — see Data models).

**Toasts + confirm modals for actions.** Success paths (sign in, register,
create group, add/delete expense, sign out, rename group, record a
settlement) call `toast.success(...)` from `react-toastify`; copy comes from
`content.*`. Toast look/position/duration are themed in `src/toast-theme.css`
and configured once via `content.toast` in `App.jsx`'s single
`<ToastContainer>` — don't add a second one. Destructive actions (deleting an
expense, removing a group member) go through `components/ConfirmModal.jsx`
rather than an inline confirm state. Recording a settlement does **not** use
`ConfirmModal` — it's not a destructive/data-loss action, same reasoning as
why adding an expense needs no confirmation either.

**Design tokens, not literal colors.** All colors, radii, and type sizes are
CSS variables in the `@theme` block of `src/index.css` (`--color-primary`,
`--color-pos-fg`/`--color-neg-fg` for financial state, `--radius-card`, etc.).
Reuse an existing token for a new UI element instead of introducing a new
color — e.g. `CategoryTag` reuses `--color-flat-bg`/`--color-flat-fg` rather
than inventing a per-category palette. The app deliberately has no shadows
anywhere; depth comes from `border-line` + background contrast only.

**Light/dark theme is token redefinition, not `dark:` variants.**
`src/context/ThemeContext.jsx` toggles a plain `dark` class on `<html>`
(persisted in `localStorage` under `splitmate_theme`, default light — it does
**not** follow the OS's `prefers-color-scheme`; `index.html` carries a tiny
inline script that applies the same class before first paint so a returning
dark-mode user never sees a flash of light). `index.css` redefines only the
_neutral_ tokens under an `html.dark` selector — `--color-canvas` (`#1c1917`),
`--color-surface` (`#292524`), `--color-line` (`#44403c`), `--color-ink`
(`#f5f5f4`), `--color-ink-soft` (`#a8a29e`), `--color-ink-muted` (`#78716c`),
`--color-stone-100`/`--color-stone-600` (avatar fallback tiles, `#44403c`/
`#d6d3d1`) — every existing Tailwind class that already uses those tokens
(`bg-canvas`, `text-ink`, `border-line`, ...) re-themes automatically, with
**zero** `dark:` classes added anywhere. Semantic accents — `--color-primary`,
`--color-danger`, and the `pos`/`neg`/`flat`/`warn` `-bg`/`-fg` pairs — are
deliberately left unchanged in both themes: they're already saturated enough
to read on a dark canvas, and it means `toast-theme.css` (which reuses
`--color-pos-fg`/`--color-danger`/etc. directly as solid toast backgrounds)
needs no dark-mode-specific handling at all. A global `@layer base` rule
transitions `background-color`/`border-color`/`color` at 200ms on every
element for a smooth switch; the existing `prefers-reduced-motion` block
already zeroes all transition durations, so that's respected automatically.
The toggle itself is `ThemeToggle` (`src/components/ThemeToggle.jsx`), a
standalone button in the navbar immediately to `AccountMenu`'s left — not
part of the dropdown. Icon-only (`Sun`/`Moon` from lucide-react, no visible
label), `aria-pressed` conveying its state to assistive tech.

**Modals** (`AddExpenseModal`, `ConfirmModal`) are hand-rolled dialogs, not a
library: `role="dialog"`/`role="alertdialog"`, focus trapped via a manual
`Tab`/`Shift+Tab` handler, Escape closes, focus restored to the previously
focused element on unmount, background scroll locked via `document.body.style.overflow`.
Follow this pattern for any new modal rather than reaching for a dependency.

**Shared UI primitives** live in `src/components/ui.jsx` (`Button`, `Field`,
`TextInput`, `FormError`, `StatusBadge`, `CategoryTag`, `Money`, `BalancePill`,
`Avatar`, `EmptyState`, `Spinner`, `LoadingState`). Prefer these over ad hoc
markup for a new field or badge. `Avatar` takes optional `src` (a photo URL,
falling back to initials — and back again via an `onError` handler if the
image fails to load) and `size` (`'sm'` default / `'lg'` for Profile's larger
photo) — every pre-existing call site passing neither is unaffected.
`Spinner`/`LoadingState` are the one deliberate exception to "nothing else in
the app animates" (DESIGN.md → Elevation & Depth) — `Spinner` respects
`prefers-reduced-motion` the same way the app's other two animations do.

**Loading state, not empty state, while the cache hasn't synced.**
`storage.js`'s cache starts empty and every read is synchronous against it,
so a page rendering right after login (or a hard refresh) can flash "no
groups"/a `$0` dashboard, or — worse — `GroupDetail`/`GroupSettings` can
flash "not found" for a group that just hasn't arrived yet, not one that
doesn't exist. `useStoreReady()` (`src/hooks/useStore.js`, same
`useSyncExternalStore` wiring as `useStoreVersion()`) is `true` once the
current session's first sync has completed (success or failure — a
permanent spinner on a genuine outage is worse than falling back to
stale/empty cache); it resets on every fresh login. Check it _before_
trusting an empty/null result and render `LoadingState` instead —
`Dashboard`, `Reports`, `GroupDetail`, and `GroupSettings` all do this, the
latter two checking it ahead of their existing "not found" gate specifically
to avoid that false-not-found flash.

**Supabase RLS gotchas** (discovered the hard way — don't reintroduce these):

- A policy's `WITH CHECK`/`USING` can't safely do a plain subquery against
  another RLS-protected table if that table's own SELECT policy depends on
  the row you're in the middle of creating — classic circular dependency
  (e.g. inserting a group's first `group_members` row needs to check
  `groups.created_by`, but `groups`' SELECT policy requires already being a
  `group_members` row). Fix: wrap the cross-table check in its own
  `SECURITY DEFINER` helper function (see `is_group_creator`,
  `is_group_member`, `shares_group_with`) so it bypasses that table's RLS for
  just that one check, and `grant execute ... to authenticated` on it
  (`SECURITY DEFINER` still requires an EXECUTE grant to be callable at all).
- Don't chain `.select()` after a Supabase `.insert(...)` for a row whose
  visibility depends on itself existing (e.g. a brand-new group's first
  member row). That sends `Prefer: return=representation`, which makes
  PostgREST also apply the table's SELECT policy to the row it just
  inserted — which can fail even when the INSERT's own `WITH CHECK` is
  perfectly correct. `storage.js`'s writes never chain `.select()` for this
  reason.
- Revoking `EXECUTE` on a `SECURITY DEFINER` function only works if you name
  the actual role (`revoke ... from anon, authenticated`) — Supabase's
  default privileges grant functions to those roles directly, not via the
  `PUBLIC` pseudo-role, so `revoke ... from public` is a silent no-op there.
- Supabase Auth rejects signups (and password resets) for `@example.com` /
  `@example.org` (RFC 2606 reserved domains) — use a real-looking domain for
  any test account created through the actual UI. Doesn't affect accounts
  inserted directly via SQL (bypasses that validator). The project currently
  has no seed data at all (see Environment and config) — every account ever
  created in it was deleted in a full reset, so there's nothing to reference
  by name here anymore.
- Editing `public.users.email` directly (SQL, or any path other than the
  Auth-driven flow in Data models → Profile) desyncs it from that row's own
  `auth.users.email`. Since `public.users.email` has a `UNIQUE` constraint,
  a stale mismatched row can silently block a _different, real_ signup for
  that address — `handle_new_user()`'s `insert into public.users` hits the
  unique violation and Supabase surfaces the unhelpful "Database error saving
  new user" to the client, with no clue which email actually collided.
  Diagnose by comparing `public.users.email` against `auth.users.email` for
  the same `id`.
- A `type="email"` input inside a `<form onSubmit>` lets the browser's own
  native validation tooltip intercept an invalid address before the JS
  submit handler ever runs, bypassing the app's own inline `FormError` —
  give the submit button `type="button"` with its own `onClick` (plus a
  separate `onKeyDown` Enter handler on the input) instead of relying on
  form submission, exactly like `CreateGroup.jsx`'s and `GroupSettings.jsx`'s
  add-member controls already do.

## Environment and config

- `.env` (gitignored) / `.env.example` (committed): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`. `src/data/supabaseClient.js` throws at
  import time if either is missing.
- `.gitignore` also excludes `.playwright-mcp/` (snapshot/console-log output
  from ad hoc Playwright MCP testing — not a durable project artifact) and
  `.claude/worktrees/` (ephemeral worktrees from the Agent tool's
  `isolation: "worktree"` option, used for running parallel subagents — see
  Known issues for a mistake this caused before it was gitignored).
- This project's Supabase email sending is on the low-volume default sender
  (no custom SMTP configured) — repeated signup/password-reset testing can
  trip "email rate limit exceeded." Not a code bug; either wait it out or add
  custom SMTP in Supabase Studio.
- A public `avatars` Storage bucket holds profile photos — public read;
  write (insert/update/delete) restricted to a user's own
  `{userId}/...` folder via a storage.objects RLS policy keyed on
  `(storage.foldername(name))[1] = auth.uid()::text`. `anon` gets no write
  grant, same "nothing works without a real session" stance as every table.
- **The live database currently has zero seed/test data** — every account,
  group, and expense that existed was deleted in a full reset (the user's
  own real account plus a from-scratch group is the only thing in it now).
  `Login.jsx` no longer has quick-login test-account buttons for this reason.
  If you need to exercise a multi-member scenario again, register fresh
  accounts through the actual UI (Supabase Auth rejects `@example.com`/
  `@example.org` — see Supabase RLS gotchas) or insert rows directly via SQL.

## Known issues

- **Mobile (~375px) dashboard**: a group card's subtitle line (person/pending/
  expense count) wraps awkwardly instead of truncating, because the balance
  pill next to it claims a fixed width. `Dashboard.jsx`'s `GroupRow` — the
  title has `truncate`, the subtitle doesn't. Not fixed yet.
- **`AppShell`'s navbar wraps on narrow viewports (~390px) for a long signed-in
  name** — the `AccountMenu` trigger (avatar + name + chevron) wraps onto a
  second line and overlaps the page content directly below the sticky
  header, since the header has no `flex-wrap` handling and a fixed height.
  Reproduces on any signed-in page (confirmed on Dashboard, Group Detail, and
  Profile at 375px); not fixed yet.
- **`CreateGroup`'s pending/active preview** can show "pending" for an
  invited email that's actually already registered, if you don't already
  share a group with them — RLS deliberately won't let the client check an
  arbitrary email's account status (anti-enumeration). Resolves correctly to
  "active" the moment the group is actually created.
- **Background write failures are silent.** `createGroup`/`createExpense`/
  `deleteExpense`/`renameGroup`/`removeMember`/`recordSettlement`/
  `updateGroupBudget`/`addMember`/`updateCurrentUserName`/
  `updateCurrentUserAvatar`/`updateCurrentUserMobile` all roll back their
  optimistic cache update on a failed Supabase write and `console.error` it,
  but nothing shows the user a toast — there's no `await`able call site left
  for that. Would need their call sites to go `async` to fix.
- **`utils/csvExport.js` duplicates `utils/groupExport.js`'s CSV-escaping
  logic** (`csvEscapeField`/`toCsv`) instead of sharing it — `specs/reports.md`
  called out extracting both into a shared `utils/csv.js` at implementation
  time, but that extraction wasn't done. Two copies to keep in sync if the
  CSV format ever changes.
- **Running parallel subagents (Agent tool, `isolation: "worktree"`) against
  this repo**: a worktree's checkout can lag a commit or two behind the
  branch it forked from (observed once — a just-committed doc update was
  missing from a worktree that otherwise had all the functional code it
  needed) — don't rely solely on "read CLAUDE.md first" for critical context
  in a subagent prompt; restate the load-bearing rules directly too. If
  multiple such agents drive the app through the _same_ shared browser
  automation profile, their Supabase sessions can race on token refresh and
  leave a stale/exhausted one behind afterward — the dashboard silently shows
  zero groups/balances with no console error. It's a test-harness artifact,
  not an app bug: sign out and log back in fresh and it resolves immediately.
