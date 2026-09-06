---
name: Splitmate
description: Warm, plainspoken expense-splitting for groups of friends.
colors:
  ember-orange: "#ea580c"
  rust: "#c2410c"
  warm-paper: "#f8f7f4"
  pure-white: "#ffffff"
  warm-sand: "#e8e4de"
  espresso: "#1c1917"
  warm-taupe: "#78716c"
  dusty-stone: "#a8a29e"
  mint-bg: "#ecfdf5"
  deep-emerald: "#065f46"
  blush-bg: "#fef2f2"
  deep-brick: "#991b1b"
  ash-bg: "#f5f5f4"
  slate-stone: "#57534e"
  cream-bg: "#fffbeb"
  amber-bark: "#92400e"
  signal-red: "#dc2626"
  deep-red: "#b91c1c"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: "36px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "26px"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  micro:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
rounded:
  control: "8px"
  card: "12px"
  modal: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ember-orange}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.rust}"
  button-secondary:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.warm-paper}"
  button-danger:
    backgroundColor: "{colors.signal-red}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-danger-hover:
    backgroundColor: "{colors.deep-red}"
  card:
    backgroundColor: "{colors.pure-white}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  category-tag:
    backgroundColor: "{colors.ash-bg}"
    textColor: "{colors.slate-stone}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  balance-pill-credit:
    backgroundColor: "{colors.mint-bg}"
    textColor: "{colors.deep-emerald}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  avatar:
    backgroundColor: "{colors.ash-bg}"
    textColor: "{colors.slate-stone}"
    rounded: "{rounded.full}"
    size: "28px"
---

# Design System: Splitmate

## Overview

**Creative North Star: "The Friendly Tab"**

Splitmate looks like the running tab a group of friends keeps between
themselves — plain, warm, and legible, never a finance product performing
trustworthiness at you. One confident orange carries every interactive
moment (the mascot, the buttons, a focused field, an active link); every
other surface stays warm-neutral paper and ink so that orange never has to
compete for attention. The system is deliberately flat: no shadow, glow, or
gradient anywhere — separation comes from a single hairline border and the
contrast between the warm page canvas and white cards, the way a receipt
sits on a table rather than floating above it.

Type is a single sans face (Inter) at six fixed sizes and nothing else;
components are soft and approachable — generously rounded, generously
padded — but restrained, never playful or bouncy. Money is the one thing
that gets a structural guarantee: every figure renders in tabular numerals
so a column of amounts always lines up, and its color is never decorative,
only ever reporting whether a balance is owed, owed-to-you, or settled.
Motion is used exactly twice — a modal veil fades in, its sheet rises and
settles — and respects reduced-motion; nothing else in the app animates.

**Key Characteristics:**
- One accent color, reserved entirely for interaction and state — never decoration.
- Flat by construction: depth is a border and a background shift, not a shadow.
- A six-step type scale, one typeface, no display face.
- Money always tabular, always colored by what it means, never by taste.
- Soft, rounded, generously-padded components; nothing sharp or clinical.

## Colors

Warm neutrals carry the page; one saturated orange carries every
interactive moment; a small set of semantic colors report money and status
and are never used decoratively.

### Primary
- **Ember Orange** (`#ea580c`): Every interactive surface — primary buttons, links, the focus ring, the mascot, the "mate" half of the wordmark, active state. Nothing else is ever this color.
- **Rust** (`#c2410c`): The hover state for Ember Orange, and only that.

### Secondary
- **Deep Emerald** on **Mint** (`#065f46` on `#ecfdf5`): Reports a positive money state — you're owed, a member is active. A financial signal, not a brand color.
- **Deep Brick** on **Blush** (`#991b1b` on `#fef2f2`): Reports a negative money state — you owe, a form error banner.
- **Amber Bark** on **Cream** (`#92400e` on `#fffbeb`): Reports exactly one state — a group member who hasn't registered yet ("pending").

### Tertiary
- **Signal Red** (`#dc2626`) / hover **Deep Red** (`#b91c1c`): Destructive actions only — the delete button and its confirm-delete dialog. Distinct from the financial reds above: this signals an action being taken, not a balance being reported.

### Neutral
- **Warm Paper** (`#f8f7f4`): Page canvas, everywhere.
- **Pure White** (`#ffffff`): Card, modal, and input surfaces, laid over Warm Paper.
- **Warm Sand** (`#e8e4de`): The one border color in the entire app — 1px, always.
- **Espresso** (`#1c1917`): Primary text.
- **Warm Taupe** (`#78716c`): Secondary text — intro copy, captions, nav labels.
- **Dusty Stone** (`#a8a29e`): Placeholder and disabled-level text, the quietest tone that still reads.
- **Ash** on itself (`#f5f5f4`): The one neutral badge/avatar fill — a settled balance, a category tag, an avatar background. Paired with **Slate Stone** (`#57534e`) text.

### Named Rules
**The One Voice Rule.** Ember Orange appears only on buttons, links, a focused input, and active state. If something on screen is orange, it is either asking to be clicked or telling you it already was.

**The Signal, Not Style Rule.** Every non-neutral color besides Ember Orange exists to report a fact (owed / owes / pending / destructive) — never to decorate a card, a heading, or an icon.

## Typography

**Body Font:** Inter (with `ui-sans-serif, system-ui, -apple-system, sans-serif`)

**Character:** One typeface, used at every weight the system needs (400/500/600/700/800) instead of pairing in a second face. Plainspoken and legible over expressive — the type never has a "voice" of its own, it carries the app's.

### Hierarchy
- **Display** (800, 30px/36px, `-0.02em`): The landing headline and a group's headline balance figure — the only two places the app ever raises its voice. Fixed, not fluid: it sits inside stat cards as narrow as ~200px (Dashboard's three-column balance row), so scaling it with viewport width overflows its own container long before it reaches hero scale. The landing page's own `<h1>` is a deliberate, page-scoped exception that exceeds this token (see Layout) — it is not a change to the shared token.
- **Headline** (700, 24px/30px): Every page's `<h1>` — Dashboard, Group Detail, the auth screens.
- **Title** (600, 18px/26px): Section headings within a page, and modal titles.
- **Body** (400, 16px/24px): Paragraph copy — the landing intro, expense descriptions, empty-state text.
- **Label** (500, 14px/20px): Buttons, form labels, nav items, most in-app UI chrome — the size the interface itself speaks in.
- **Micro** (500, 12px/16px): Timestamps, hints, badges, tags — facts in the margin.

### Named Rules
**The Six-Step Rule.** The entire app draws from six font sizes (12/14/16/18/24/30px) and no others. A seventh size is never introduced for a one-off heading.

## Layout

A single narrow column, `680px` max-width, centered with `16px` side padding (`.PAGE` in `AppShell.jsx`) — the same container on every page, signed-in or not. No sidebar, no multi-column shell; the product is a list of numbers, not a workspace. Signed-in pages get a `56px` sticky header holding the wordmark and the signed-in identity/sign-out control; the public landing page reuses the identical header height and container but with a sign-in link in place of the identity block.

Vertical rhythm runs on Tailwind's default 4px-based spacing scale: `20px` (`p-5`) internal card padding, `32px` (`mt-8`) between major page sections, `8px`–`16px` gaps within a cluster of related elements (a button row, an icon-plus-label pair). Layout is mobile-first throughout, with a single breakpoint in use — Tailwind's stock `sm` (`640px`) — which promotes a grid from one column to two or three (the expense-split form, the dashboard's stat row) and turns a modal from a bottom sheet into a centered dialog (see Modals below).

## Elevation & Depth

Flat. There is no shadow, glow, or blur anywhere in the app. Depth is conveyed entirely by a `1px` border (Warm Sand) plus the contrast between the Warm Paper canvas and Pure White surfaces sitting on it — the same way a sheet of paper reads as "above" a table without needing to cast a shadow.

### Named Rules
**The Flat-By-Default Rule.** No component ever gains a `box-shadow`. If something needs to look "raised," give it a border and a lighter background instead.

## Shapes

Three radius steps and nothing between them: `8px` (Control) for every button and input, `12px` (Card) for cards, panels, and the landing's product-demo panel, `16px` (Modal) for dialogs. Badges, tags, avatars, and the balance pill all round to a full pill (`9999px`) instead of using the card radius at a small size — anything that reports a discrete state is a pill; anything that contains content is a card. Borders are always `1px solid` Warm Sand; no dashed, dotted, or heavier border ever appears.

## Components

### Buttons
- **Shape:** Control radius (`8px`), `10px 16px` padding, `14px` Label-weight text.
- **Primary:** Ember Orange fill, white text, Rust on hover — the default action on every screen (get started, sign in, add expense, save).
- **Secondary:** Pure White fill, Warm Sand border, Espresso text, Warm Paper on hover — the paired lesser action (sign in from the landing page, cancel in a modal).
- **Danger:** Signal Red fill, white text, Deep Red on hover — reserved for the one destructive confirmation (delete expense).
- **Text Button:** No fill or border, Warm Taupe rising to Espresso/Ember Orange/Signal Red on hover depending on tone — used where a full button would be too heavy (an inline "remove" action inside a list row).

### Category Tag & Status Badge (signature)
- **Style:** Full pill, Ash fill, Slate Stone text, Micro-weight (12px/500) label.
- **Rule:** One neutral tone for every category and one for every "active" status — the app deliberately never assigns a color per category or per member; **Status Badge** swaps to Cream/Amber Bark only for the single "pending" state.

### Balance Pill (signature)
- **Style:** Full pill, `4px 12px` padding, 13px semibold text.
- **States:** Ash/Slate Stone when settled, Mint/Deep Emerald when a balance is owed to the viewer, Blush/Deep Brick when the viewer owes — the pill's color is the balance; no separate icon or indicator ever restates it.

### Cards / Containers
- **Corner Style:** Card radius (`12px`).
- **Background:** Pure White on Warm Paper.
- **Shadow Strategy:** None — see Elevation & Depth.
- **Border:** `1px solid` Warm Sand.
- **Internal Padding:** `20px` (`p-5`).

### Inputs / Fields
- **Style:** Pure White fill, Warm Sand border, Control radius, 14px text, Dusty Stone placeholder.
- **Focus:** Border shifts to Ember Orange plus a `3px` Ember Orange ring at 12% opacity — no glow, no shadow.
- **Error:** A dedicated error banner (Blush fill, Deep Brick text, `role="alert"`) beneath the field rather than a red field border.

### Avatars
- **Style:** Full pill, `28px`, Ash fill, Slate Stone initials (max two letters).
- **Rule:** One neutral treatment for every person — no per-user color coding, ever.

### Modals (signature)
- **Style:** A `40%`-black veil fades in (`veil-in`, 140ms ease-out); the dialog itself rises 8px and settles while fading in (`sheet-in`, 160ms, `cubic-bezier(0.2, 0.7, 0.3, 1)`). Both are disabled under `prefers-reduced-motion`.
- **Responsive shape:** Below `640px` the dialog is a bottom sheet — pinned to the viewport's bottom edge, square top corners, full-bleed. At `sm:` and up it becomes a centered dialog with the full Modal radius (`16px`) on every corner and `24px` of breathing room around it.
- **Behavior:** `role="dialog"` (or `role="alertdialog"` for a destructive confirmation), focus trapped and moved to the first control on open, Escape closes, focus restored to the trigger on close, background scroll locked.

### Navigation
- **Style:** A single `56px` sticky header — wordmark (mascot mark + two-tone "Split" + "mate" name, the "mate" half in Ember Orange) on the left, the signed-in identity and a small Secondary sign-out button on the right. No hamburger menu, no mobile drawer: the nav never grows past one action, so it never needs to collapse.

### Money (signature)
- **Style:** Every rendered amount uses tabular numerals (`font-variant-numeric: tabular-nums`) at bold weight, so a column of money always lines up digit-for-digit.
- **Color:** Never a fixed color — always one of Espresso (neutral), Deep Emerald (positive), Deep Brick (negative), or Slate Stone (flat/settled), matching the same roles used everywhere else money is reported.

## Do's and Don'ts

### Do:
- **Do** reserve Ember Orange for buttons, links, a focused input, and active state — nowhere else.
- **Do** render every money figure with tabular numerals (the `.num` utility) and one of the four financial-state colors.
- **Do** build new surfaces from the three-step radius scale (8/12/16px) plus full pills — never an arbitrary corner radius.
- **Do** convey elevation with a border and a background shift, never a shadow.

### Don't:
- **Don't** add a `box-shadow`, glow, or gradient anywhere in the app.
- **Don't** invent a per-category or per-user color — categories and avatars share one neutral (Ash/Slate Stone) tone by design.
- **Don't** introduce a type size outside the six-step scale (12/14/16/18/24/30px).
- **Don't** use Signal Red (or its hover) outside a destructive-confirmation flow — it is not a general-purpose "error" color; form errors use Deep Brick/Blush instead.
