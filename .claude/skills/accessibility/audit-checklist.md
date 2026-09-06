# Accessibility Audit Checklist

Run this after building any component or page.

## Forms

- [ ] Every <input> has an <label> with matching htmlFor/id pair
- [ ] Required fields marked with required attribute AND visual indicator
- [ ] Error messages use role="alert" so screen readers announce them
- [ ] Error messages linked to field via aria-describedby="error-id"
- [ ] Placeholders exist alongside labels — never instead of labels
- [ ] submit button has descriptive text ("Save expense" not just "Submit")

## Buttons and links

- [ ] Every <button> has text or aria-label (icon-only buttons fail without it)
- [ ] No <div onClick> — use <button> for actions, <a> for navigation
- [ ] Disabled buttons have aria-disabled="true" (not just visually grayed)
- [ ] Focus ring visible on all interactive elements (use focus:ring-2 focus:ring-orange-500)

## Images and icons

- [ ] Decorative icons: aria-hidden="true"
- [ ] Meaningful images: descriptive alt text
- [ ] Icon-only buttons: aria-label on the button, aria-hidden on the icon

## Structure and navigation

- [ ] Page has exactly one <h1>
- [ ] Headings don't skip levels (h1 → h2 → h3, never h1 → h3)
- [ ] Lists use <ul>/<ol> + <li>, not nested <div>s
- [ ] Modals trap focus and restore it on close

## Color and contrast

- [ ] Balance positive/negative uses color AND text ("You're owed" / "You owe")
- [ ] Pending status uses color AND text ("Pending" label — not just gray dot alone)
- [ ] Don't rely on color alone anywhere
