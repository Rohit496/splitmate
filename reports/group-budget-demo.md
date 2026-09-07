# Group Budget — Demo

A walkthrough of the optional group budget feature, verified live against
the dev server and the real Supabase project.

## What it does

- The creator of a group can set an optional total budget (e.g. $20,000) in
  **Group Settings**, editable or clearable anytime after the group exists.
- Every member (not just the creator) sees a read-only progress bar on the
  **Dashboard** card and the **Group Detail** header, comparing total group
  spend against the budget.
- No budget set → no budget UI anywhere. It's fully opt-in.

## Try it yourself

1. Open `/login` and click one of the "Test accounts" quick-login buttons
   (e.g. `priya.sharma@example.com`) — password autofills.
2. From the Dashboard, open a group you created, then its gear icon →
   **Group Settings** → **Trip budget** → enter an amount → **Save**.
3. Go back to Dashboard and into the group — both now show a progress bar:
   - Green while spend is under ~90% of budget.
   - Amber approaching the limit.
   - Red once spend exceeds the budget, with a "$X over budget" label.
4. **Clear budget** on the Settings page removes the indicator everywhere.

## Verified

Driven end-to-end via Playwright against `priya.sharma@example.com`'s
"Goa Trip" test group:

- Setting a budget fires a "Budget updated" toast and both surfaces update
  immediately (no manual refresh — reactive via `useStoreVersion()`).
- Under-budget renders the green tone with the correct spent/budget labels.
- Dropping the budget below current spend flips the bar to red with the
  correct overage amount.
- Clearing the budget removes the UI from both surfaces and persists as
  `budget_cents = null` in Postgres.
- Zero and negative budget values are rejected inline, no toast, no write.
- A group with no budget set renders nothing extra, matching every
  pre-existing group's default state.
