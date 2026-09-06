# Settle Up Feature Review

Scope: the "Settle up" feature (commit `a7548a8`, merged `c48746f`) —
`src/data/storage.js` (`settlementsCache`, `fetchSettlements`,
`listSettlements`, `recordSettlement`, `removeMember`), `src/utils/balances.js`
(`netBalances`/`groupBalances`/`balanceFor`'s `settlements` param),
`src/pages/GroupDetail.jsx`, `src/pages/Dashboard.jsx`, `src/constant.js`.

## Database

### Findings

1. **Critical — `src/data/storage.js:658-703` (`recordSettlement`): no validation that `fromEmail`/`toEmail` are actual group members, or that the recording user is one of the two parties.**
   The live RLS INSERT policy on `public.settlements` is
   `is_group_member(group_id) AND created_by = auth.uid()` — it doesn't check
   this either, and there's no FK/CHECK tying `from_email`/`to_email` to
   `group_members`. Any authenticated member of a group can call the
   `recordSettlement` path (or the underlying Supabase insert directly,
   bypassing the UI, which only ever wires this up from
   `simplifySettlements()`-derived pairs) to record a fabricated settlement
   between two _other_ people — even someone not in the group — for an
   arbitrary amount. Because `settlements` has no UPDATE/DELETE policy
   (permanent-history by design), this corruption is permanent and
   unfixable through the app.
   **Fix:** add a `WITH CHECK` requiring `from_email`/`to_email` to be
   members of `group_id`, and ideally that `created_by`'s email matches one
   of the two parties.

2. **High — `src/data/storage.js:443-482` (`removeMember`) only checks `expensesCache`, never `settlementsCache`.**
   A member who has settled a debt (via `recordSettlement`) but whose
   triggering expense was later soft-deleted (`isDeleted: true`, dropped from
   the `hasExpenses` scan) can be removed by the group creator — nothing
   blocks it client-side or server-side. Their settlement row survives
   forever (settlements are never deleted); `netBalances`'s `add()` helper
   (`src/utils/balances.js:46`) creates a fresh balance-map entry for any
   `settlement.fromEmail`/`toEmail` not already in the current
   `memberEmails` seed set, so the removed member keeps resurfacing in the
   group's simplified settle-up list with no `group_members` row left to
   resolve their name (`GroupDetail.jsx:309-310` falls back to the raw
   email).

3. **Low — `src/data/storage.js:658-676` (`recordSettlement`) has no synchronous `amountCents > 0` check before the optimistic cache push**, unlike `createExpense`'s synchronous split-sum check. The DB's `amount_cents > 0` CHECK constraint eventually rejects a bad value and rolls the optimistic entry back, but a transient invalid entry could render in the UI first. Currently unreachable through the shipped UI (the only caller, `GroupDetail.jsx:152-161`, always passes `simplifySettlements`-derived positive amounts), so this is a defensive gap, not an exploitable one today.

### Confirmed safe

- `fetchSettlements()` (`storage.js:219-226`) is a single batched query — no N+1.
- Identity handling is correct: `emails` arrays include pending members (no `user_id`), and balance math keys purely on email, so a pending member's settlement participation isn't silently dropped.
- `listSettlements(groupId)` has no internal membership check, mirroring the accepted `listExpenses` design — but every call site (`GroupDetail.jsx:95-96`, `Dashboard.jsx:58`) already gates on membership before calling it. No stale-cache/cross-user leak found.
- RLS SELECT policy (`is_group_member(group_id)`) correctly scopes reads.
- No stray Supabase calls related to settlements outside `storage.js` — "storage is the only data boundary" holds for this feature.
- `mapSettlementRow` resolves `recordedBy` via the same safe `userId -> email` fallback pattern as expenses' `createdBy`/`deletedBy`.
- Settlements have no soft-delete concept — `listSettlements` returning all rows unfiltered is correct, not a missed-filter bug.

### Ground truth used (verified via direct SQL against the live Supabase project)

```
INSERT policy: is_group_member(group_id) AND created_by = auth.uid()
SELECT policy: is_group_member(group_id)
No UPDATE or DELETE policy exists.
CHECK: amount_cents > 0
FKs: created_by -> users.id, group_id -> groups.id (cascade)
No FK/CHECK ties from_email/to_email to group_members.
```

## Security

No secrets/credentials, raw-HTML rendering, or unauthenticated-route issues
were found in this scope — all interpolated names/emails go through JSX text
nodes (React-escaped), there's no `dangerouslySetInnerHTML` anywhere in
`src/`, and `/group/:id` is behind `RequireAuth` with an explicit membership
check in `GroupDetail.jsx`'s `data` `useMemo` (line 95-96) before any
settlement data is computed or shown.

### Findings

1. **Medium — `src/pages/GroupDetail.jsx:152-161` (`handleSettleUp`) and `334-341` (the "Settle up" button) — no re-entrancy guard against duplicate submissions.**
   The button has no `disabled`/in-flight state, and `handleSettleUp` calls
   `storage.recordSettlement(...)` synchronously with no debounce. A fast
   double-click (two separate click events) can fire `recordSettlement`
   twice for the same computed debt before the `useStoreVersion()`-driven
   re-render removes that entry from the `settlements` list. Because
   `public.settlements` has no UPDATE or DELETE policy at all
   (permanent-history by design), a duplicate settlement recorded this way
   is permanent and can't be corrected or removed through the app.
   **Fix:** track a per-settlement "recording" state (disable the specific
   button the instant it's clicked) so a double click can't submit twice.

2. **Low — `src/data/storage.js:692` (`recordSettlement`'s failure handler) — raw Supabase error object logged to the console.**
   ```js
   console.error('[storage] recordSettlement failed, rolling back', error)
   ```
   Dumps the full Supabase/Postgres error object to the browser console on
   any insert failure — including, once the RLS `WITH CHECK` fix from the
   Database section is added, likely RLS-policy-violation messages,
   constraint/column names, or other internal schema details rather than
   just a user-safe message. Same pattern as elsewhere in `storage.js`, but
   this is a new call site introduced by this feature.
   **Fix:** log only `error.message`, or route through a single redaction
   helper, rather than the raw error object.

Security review complete. 2 issues found.

## Frontend

Reviewed against the design system (token/color consistency, no inline
styles/shadows/gradients), accessibility, React quality, and code
consistency — scoped to the settlements list/button in `GroupDetail.jsx`,
the settlement-adjusted balances in `Dashboard.jsx`, `BalanceBar.jsx`,
`ui.jsx`'s `Button`, and the new `constant.js` copy.

- **Design system**: all colors use existing tokens (`bg-neg-bg`,
  `text-neg-fg`, `bg-pos-bg`, `text-pos-fg`, `border-line`, etc.) — no
  inline styles, shadows, or gradients. Spacing/sizing matches other
  components.
- **Accessibility**: the "Settle up" button has visible text (no icon-only
  aria-label gap); balance state is conveyed by text labels ("You're
  owed"/"You owe"/"All settled"), not color alone.
- **React quality**: the settlements list key
  (`${settlement.from}-${settlement.to}`) is a stable, unique composite key;
  `useMemo` dependency arrays are correct; no state mutations found.
- **Code consistency**: component names match filenames, no excessive prop
  drilling, all copy sourced from `constant.js`.

No new findings — the issues already listed above (Database findings 1-3,
Security findings 1-2) cover the real problems in this feature; the
frontend implementation itself follows Splitmate's conventions cleanly.

Frontend review complete. 0 issues found.
