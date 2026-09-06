/**
 * Every piece of user-facing copy in the app lives here — headings, labels,
 * placeholders, button text, error messages, toasts, aria-labels. Components
 * import from this file instead of writing text inline, so the app's voice
 * can be reviewed and changed in one place.
 *
 * Entries that depend on a count or a name are functions instead of plain
 * strings — call them with the value that decides the wording.
 */

export const content = {
  app: {
    name: 'Splitmate',
    nameFirst: 'Split',
    nameSecond: 'mate',
    metaDescription:
      'Splitmate keeps track of who paid for what, then works out the fewest transfers that settle the group.',
    footer: 'Everything you enter stays in this browser.',
  },

  toast: {
    position: 'top-right',
    durationMs: 3000,
  },

  categories: {
    label: 'Category',
    options: [
      'Food & Drinks',
      'Transport',
      'Accommodation',
      'Activities',
      'Shopping',
      'Utilities',
      'Other',
    ],
    default: 'Other',
  },

  nav: {
    signOut: 'Sign out',
    signedOutToast: 'Signed out',
  },

  landing: {
    headerSignIn: 'Sign in',
    headline: 'Five dinners. One payment.',
    intro:
      'Splitmate keeps the running tab for a group of friends — who paid, who was there, what each share came to — then works out the smallest set of transfers that clears it.',
    getStarted: 'Get started',
    signIn: 'Sign in',
    demoGroupName: 'Goa trip',
    demoPeopleCount: (count) => `${count} people`,
    demoExpenses: [
      { description: 'Dinner at Antares', payer: 'Shubham', amount: '$1,000' },
      { description: 'Airport cab', payer: 'Bob', amount: '$600' },
    ],
    demoPayerLine: (payer) => `${payer} paid`,
    settlesAs: 'Settles as',
    demoSettlementLabel: 'Bob owes Shubham',
    demoSettlementCents: 20000,
    capabilities: [
      {
        title: 'Groups',
        body: 'Start one for the trip, the flat, the weekend. Add people by email — they can be on the list before they’ve signed up.',
      },
      {
        title: 'Shared expenses',
        body: 'Record what it cost, who paid, and who was in on it. Each person’s share is worked out as you type.',
      },
      {
        title: 'Who owes what',
        body: 'Every debt in the group, resolved down to the fewest payments that clear it. No chains of small transfers.',
      },
    ],
    ctaLine: 'Set up a group in about a minute.',
    footer: 'Splitmate keeps everything in this browser. Nothing is sent anywhere.',
  },

  login: {
    title: 'Sign in',
    intro: 'Pick up your groups where you left them.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submit: 'Sign in',
    footerPrompt: 'New here?',
    footerLink: 'Create an account',
    testAccountsIntro: 'Test accounts — all use the password',
    testAccountsPassword: 'password',
    testAccounts: ['shubham@test.com', 'bob@test.com', 'rahul@test.com', 'eva@test.com'],
    welcomeToast: 'Welcome back!',
  },

  register: {
    title: 'Create an account',
    intro: 'Any group that already lists your email will be waiting for you.',
    nameLabel: 'Name',
    namePlaceholder: 'Priya Sharma',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordHint: 'At least 6 characters.',
    passwordPlaceholder: '••••••••',
    submit: 'Create account',
    footerPrompt: 'Already have an account?',
    footerLink: 'Sign in',
    successToast: 'Account created',
  },

  dashboard: {
    heading: 'Your tab',
    intro: 'Across every group you’re in.',
    owedToYou: 'Owed to you',
    youOwe: 'You owe',
    netBalance: 'Net balance',
    groupsHeading: (count) => (count > 0 ? `Groups (${count})` : 'Groups'),
    newGroup: 'New group',
    emptyTitle: 'No groups yet',
    emptyBody:
      'A group is where a shared tab lives — a trip, a flat, a weekend away. Make one and add the people you split with.',
    createGroup: 'Create group',
    personCount: (count) => `${count} ${count === 1 ? 'person' : 'people'}`,
    pendingSuffix: (count) => ` · ${count} pending`,
    expenseSuffix: (count) => ` · ${count} ${count === 1 ? 'expense' : 'expenses'}`,
  },

  createGroup: {
    back: '← Groups',
    heading: 'New group',
    intro: 'Name it after the thing you’re splitting, then add everyone who’s in on it.',
    groupNameLabel: 'Group name',
    groupNamePlaceholder: 'Goa trip',
    membersLabel: 'Add members by email',
    membersHint: 'One at a time. People who haven’t signed up yet join the group when they register.',
    memberPlaceholder: 'friend@example.com',
    add: 'Add',
    you: 'you',
    remove: 'Remove',
    removeAria: (name) => `Remove ${name}`,
    pendingNotice: (count) =>
      `${count} ${count === 1 ? 'person hasn’t' : 'people haven’t'} signed up yet. They’ll see this group as soon as they create an account with that email.`,
    submit: 'Create group',
    cancel: 'Cancel',
    nameRequiredError: 'Give the group a name.',
    invalidEmailError: 'Enter a valid email address.',
    alreadyInGroupError: 'You’re already in the group.',
    alreadyInvitedError: 'That person is already on the list.',
    successToast: 'Group created',
  },

  groupDetail: {
    back: '← Groups',
    addExpense: 'Add expense',
    personCount: (count) => `${count} ${count === 1 ? 'person' : 'people'}`,
    spentInTotal: 'spent in total',
    membersHeading: 'Members',
    you: 'you',
    pendingNotice:
      'Pending members are counted in every split. They get access once they register with that email.',
    expensesHeading: (count) => (count > 0 ? `Expenses (${count})` : 'Expenses'),
    emptyExpensesTitle: 'Nothing on the tab yet',
    emptyExpensesBody:
      'Add the first thing someone paid for and Splitmate will keep the balances from there.',
    payerLine: (payer, date) => `${payer} paid · ${date} · `,
    customShare: (count) => `${count} custom ${count === 1 ? 'share' : 'shares'}`,
    equalShare: (count) => `split ${count} ${count === 1 ? 'way' : 'ways'}`,
    remove: 'Remove',
    removeAria: (description) => `Delete ${description}`,
    deleteConfirmTitle: 'Delete this expense?',
    deleteConfirmBody: (description) =>
      `“${description}” will be removed from the group. This can’t be undone.`,
    deleteConfirmLabel: 'Delete',
    settleHeading: 'Settle up',
    noExpensesYetBalance: 'Balances appear once there’s something to split.',
    allSquare: 'Everyone’s square — no payments needed.',
    youOweLine: (name) => `You owe ${name}`,
    owesYouLine: (name) => `${name} owes you`,
    othersOweLine: (from, to) => `${from} owes ${to}`,
    paymentsClear: (count) => `${count} ${count === 1 ? 'payment' : 'payments'} clears the whole group.`,
    notFoundTitle: 'That group isn’t here',
    notFoundBody: 'It may have been removed, or the link belongs to a group you’re not part of.',
    backToGroups: 'Back to groups',
    expenseAddedToast: 'Expense added',
    expenseDeletedToast: 'Expense deleted',
  },

  addExpenseModal: {
    title: 'Add expense',
    close: 'Close',
    descriptionLabel: 'What was it for?',
    descriptionPlaceholder: 'Dinner at Antares',
    amountLabel: 'Total amount',
    dateLabel: 'Date',
    payerLabel: 'Who paid?',
    youSuffix: (name) => `${name} (you)`,
    splitLabel: 'How is it split?',
    splitEqual: 'Split equally',
    splitManual: 'Enter exact amounts',
    sharesLabel: 'Who shares it?',
    selectEveryone: 'Select everyone',
    clearAll: 'Clear all',
    you: 'you',
    amountForAria: (name) => `Amount for ${name}`,
    splitRestEqually: 'Split the rest equally',
    resetToEqualShares: 'Reset to equal shares',
    cancel: 'Cancel',
    save: 'Save expense',
    descriptionRequiredError: 'Say what the expense was for.',
    amountRequiredError: 'Enter an amount greater than zero.',
    noOneSelectedError: 'Pick at least one person to share it.',
    invalidShareError: 'Enter a valid amount for everyone sharing this expense.',
    remainderPositiveError: (amount) => `${amount} still needs to be assigned.`,
    remainderNegativeError: (amount) => `The shares add up to ${amount} more than the total.`,
    tallyEqual: (count) => `Split equally between ${count} ${count === 1 ? 'person' : 'people'}`,
    tallyNeedTotal: 'Enter a total first',
    tallyRemaining: (amount) => `${amount} left to assign`,
    tallyOver: (amount) => `${amount} over`,
    tallyAllAssigned: (amount) => `All ${amount} assigned`,
  },

  confirmModal: {
    cancel: 'Cancel',
    defaultConfirmLabel: 'Delete',
  },

  auth: {
    nameRequiredError: 'Enter your name.',
    invalidEmailError: 'Enter a valid email address.',
    passwordTooShortError: 'Use a password of at least 6 characters.',
    emailTakenError: 'That email already has an account. Sign in instead.',
    credentialsMismatchError: 'That email and password don’t match an account.',
  },

  statusBadge: {
    pending: 'pending',
    active: 'active',
  },

  balancePill: {
    allSettled: 'All settled',
    youAreOwed: 'You’re owed',
    youOwe: 'You owe',
  },
}
