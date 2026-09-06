---
name: accessibility
description: Audits and improves accessibility of React components.
when_to_use: Use after building any form, interactive component, or page. Run before marking a feature done.
---

# Accessibility Skill

## Goal

Every user should be able to use Splitmate with a keyboard only, with a screen reader, or with low vision. Accessibility is not optional.

## Audit checklist

See audit-checklist.md for the full checklist.
See bad-vs-good.md for before/after examples.

## Priority order

1. Forms — most interaction happens in forms
2. Buttons and links — must be operable by keyboard
3. Error states — screen readers must announce errors
4. Headings — navigation landmark for screen reader users
5. Color — never the only indicator of meaning

## How to apply this skill

After building a component:

1. Run through audit-checklist.md
2. For each issue, apply the pattern from bad-vs-good.md
3. Test: tab through the component — does focus order make sense?
4. Test: does every interactive element have a visible focus ring?
