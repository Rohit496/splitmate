# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Groups of friends settling up after a shared trip or outing (e.g. a weekend
away, a set of dinners) — someone in the group opens Splitmate to log who
paid for what while it's fresh, then see the smallest set of transfers that
clears everyone's debts. Not scoped to ongoing/recurring household splitting
(roommates, rent) as a distinct primary case.

## Product Purpose

Splitmate tracks shared expenses for a group and computes the fewest
payments needed to settle every balance. Success is a group being able to
go from "who owes what" confusion to a short, confirmed settle-up list
without any of them running the math by hand.

## Positioning

Zero setup, fully local, no backend: there's no server-side account system
or hosted data store to stand up or trust — everything lives in the
browser's `localStorage`. The pitch is instant and private (nothing leaves
the device), not a richer feature set than a server-backed competitor.

## Operating Context

- Used entirely in-browser, no install; a group is created, members are
  added by email, expenses are logged against the group, and balances /
  settlement suggestions are read back — all client-side.
- A member can be added by email before they've registered; they show as
  *pending* and still count in splits, becoming *active* automatically the
  moment they register with that email.
- Four seeded test accounts exist for local dev/demo use (documented in
  README), all password `password`.
- Data is scoped to one browser; there is no cross-device sync (by design —
  see Positioning).

## Capabilities and Constraints

- No backend today. `src/data/storage.js` is the sole persistence boundary,
  which the project treats as the seam a future real backend would sit
  behind. README's "Status" section names Supabase as the anticipated next
  step, but that migration has not started and is not a committed scope.
- Passwords are stored in plain text — acceptable only because accounts are
  local test data, not real user credentials.
- All money math runs in integer cents (never floats) so uneven splits
  (e.g. $10 ÷ 3) don't lose or misplace a cent.
- Expense deletes are soft (flagged, not removed); balances are always
  recomputed live from current expenses, never cached.
- Expenses carry a category, currently: Food & Drinks, Transport,
  Accommodation, Activities, Shopping, Utilities, Other (defined in
  `src/constant.js`).

## Brand Commitments

- Name: **Splitmate** (styled as "Split" + "mate" in the wordmark).
- Existing landing copy/voice: e.g. headline "Five dinners. One payment.",
  footer line "Everything you enter stays in this browser." — a direct,
  plain-spoken tone, not corporate or hype-y.
- Typography: Inter (Google Fonts). Icons: lucide-react. Design tokens
  (colors, radii, type scale) are centralized in the `@theme` block of
  `src/index.css` — reuse existing tokens rather than introducing new ones.

## Evidence on Hand

- No real customer testimonials, usage data, case studies, or press exist.
- The landing page's demo content (a "Goa trip" group, sample dinner/cab
  line items) is illustrative sample data written into the app's copy, not
  real usage evidence — future work should not treat it as a testimonial or
  extend it as if it were a real customer story.
- The four seeded test accounts exist for local dev/demo login only.

## Product Principles

1. **No setup is the feature.** Every product decision should preserve
   "open the app and start splitting" over adding friction (accounts,
   servers, sync) in exchange for more power.
2. **The settle-up math is the trust anchor.** Debt simplification (fewest
   transfers) is the mechanism the product exists to deliver — never let it
   become an incidental feature behind richer expense-tracking chrome.
3. **Balances are always derived, never stored.** Preserve the existing
   "recompute from live expenses on every read" model; it's what makes
   edits/deletes safe and is a durable architectural constraint, not just
   an implementation detail.
4. **Pending members are first-class.** A group member who hasn't signed up
   yet still fully participates in splits — this should never be treated as
   an edge case to design around.
