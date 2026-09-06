---
version: 1
slug: "src-pages-landing-jsx"
primary_target: "src/pages/Landing.jsx"
related_targets: []
---

## Scope & Mode

Route: `/` (`src/pages/Landing.jsx`). Mode: **Persuade** — the only page in the
app where a visitor decides and acts before signing in.

## Audience, job, action, proof, constraints

Audience: someone about to split a shared trip/flat/group cost, deciding
whether to bother signing up. Job: understand in seconds that Splitmate does
the settle-up math for them. Action: register (primary) or sign in
(secondary). Proof: the real demo settle-up, the true "fewest transfers"
math, one honest illustrative quote — no fabricated customer names, logos,
or usage stats. Constraints (user-pinned, override the saturated-pattern
warning where they conflict): keep Ember Orange `#ea580c` / Warm Paper
`#f8f7f4`; no gradients, no shadows, no purple; must include hero, 3-step
how-it-works, features (pending members / smart settlements / expense
history / mobile), social proof, and a dark final CTA strip.

## Direction contract

THESIS: Prove the settle-up math in the open, before asking for anything —
refuse the generic hero-plus-feature-grid template by making the
fewest-transfers mechanism the visual through-line of every section, not a
footnote claim.

OWN-WORLD: Inherit DESIGN.md as-is (Warm Paper/Pure White/Espresso, one
Ember Orange accent, flat borders, Inter six-step scale, full-pill badges).
One disclosed, surface-scoped raise: a wider `1120px` marketing container
for this page only, app pages keep the `680px` `PAGE` container. The hero
`<h1>` also renders larger than the shared Display token
(`clamp(2rem,4.5vw,3.75rem)`, applied as a one-off className on this single
element) — an earlier version of this raise instead made the shared
`--text-2xl` token itself fluid, which silently overflowed the Dashboard's
narrow balance-figure cards at wide viewports; that was a real regression,
caught by the user, and reverted. The token stays fixed at 30px/36px
everywhere except this one hero heading.

STORY: A visitor sees a real settle-up resolve immediately (the existing
Goa-trip demo, elevated into the hero), reads three steps that make the
product legible in five seconds, sees pending-members and smart-settlements
proven rather than claimed, reads one honest unattributed quote instead of
fake logos, and lands on a single dark closing strip with one button.

FIRST VIEWPORT: Wordmark left / sign-in link right at 56px. Below: the
oversized hero headline + one-line subhead + primary/secondary CTA row on
the left, the demo settle-panel on the right (stacks below on narrow) — the
mechanism visible without scrolling.

FORM: User-specified structure, precisely enough that concept-seed was not
run (new-work.md's narrow-request carve-out); shaped directly from the
brief's own section list and constraints.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying
its provenance.

## Unresolved decisions

None — palette, section list, and constraints were all pinned by the user's
brief.
