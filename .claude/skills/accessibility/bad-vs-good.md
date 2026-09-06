# Accessibility Patterns — Bad vs. Good

## Form labels

BAD — placeholder disappears when the user starts typing:
<input placeholder="Enter email" />

GOOD — label linked via htmlFor + id:
<label htmlFor="email" className="block text-sm text-gray-700 mb-1">
Email address
</label>
<input id="email" placeholder="shubham@test.com" className="..." />

---

## Error messages

BAD — screen readers don't announce a plain paragraph:
{error && <p className="text-red-500">{error}</p>}

GOOD — role="alert" triggers announcement, aria-describedby links error to field:
{error && (
<p id="email-error" role="alert" className="text-sm text-red-600 mt-1">
{error}
</p>
)}
<input
id="email"
aria-describedby={error ? "email-error" : undefined}
aria-invalid={!!error}
/>

---

## Icon-only buttons

BAD — screen reader says "button" with zero context:
<button onClick={onDelete}><TrashIcon /></button>

GOOD — aria-label describes the action:
<button onClick={onDelete} aria-label="Delete expense">
<TrashIcon aria-hidden="true" />
</button>

---

## Status indicators

BAD — color only, useless for colorblind users:
<span className={isPending ? "text-amber-500" : "text-green-500"}>●</span>

GOOD — color AND text:
<Badge color={isPending ? "amber" : "green"}>
{isPending ? "Pending" : "Active"}
</Badge>

---

## Balance amounts

BAD — a red number means nothing without sight:
<span className={amount > 0 ? "text-green-600" : "text-red-600"}>
${Math.abs(amount)}
</span>

GOOD — color AND label, text alone conveys the meaning:
<span className={amount > 0 ? "text-green-600" : "text-red-600"}>
{amount > 0 ? "You're owed" : "You owe"} ${Math.abs(amount)}
</span>

---

## Clickable divs

BAD — divs aren't in the tab order, keyboard users can't reach them:

  <div onClick={() => navigate(`/group/${id}`)}>
    <h3>{group.name}</h3>
  </div>

GOOD — button is focusable and keyboard-operable by default:
<button onClick={() => navigate(`/group/${id}`)} className="text-left w-full">
<h3>{group.name}</h3>
</button>
