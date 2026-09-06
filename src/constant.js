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

    // Hero
    headline: 'Split it. Settle it. Move on.',
    subhead:
      'Splitmate keeps the running tab for your trip, your flat, or your group — who paid, who was in on it, what everyone owes — then works out the fewest payments that clear it. No spreadsheet, no chasing anyone down.',
    getStarted: 'Get started',
    signIn: 'Sign in',
    demoCaption: 'A real settle-up, not a mockup',
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

    // How it works
    howItWorksHeading: 'How it works',
    steps: [
      {
        title: 'Create a group',
        body: 'Name it, then add the people in it by email — even the ones who haven’t signed up yet.',
      },
      {
        title: 'Add an expense',
        body: 'Say what it cost, who paid, and who it’s split between. Everyone’s share works itself out.',
      },
      {
        title: 'Settle up',
        body: 'See who owes who, collapsed into the fewest payments that clear the whole group.',
      },
    ],

    // Features — one signature capability, three supporting ones.
    featuresHeading: 'What makes the math easy',
    signatureFeature: {
      title: 'Smart settlements',
      body: 'Splitmate doesn’t just total up who owes what — it collapses every debt in the group down to the fewest payments that clear it. Six people can owe each other fifteen different ways and still settle in five transfers or fewer, never a chain of small ones.',
    },
    features: [
      {
        title: 'Pending members',
        body: 'Add someone by email before they’ve even signed up. They’re counted in every split from day one, and go active the moment they join.',
      },
      {
        title: 'Expense history',
        body: 'Every expense stays dated and categorized, so nobody has to ask what that $40 was for three weeks later.',
      },
      {
        title: 'Works everywhere',
        body: 'No app to install. Open it on a phone at the table or a laptop later — it’s the same tab either way.',
      },
    ],

    // Proof — the real settlement math, plus one honest, unattributed-to-a-
    // stranger quote (it's the same demo trip shown in the hero above).
    proofHeading: 'The fewest payments, guaranteed',
    proofStatLine:
      'A group of 6 can owe each other 15 different ways by the end of a trip. Splitmate always settles it in 5 payments or fewer.',
    proofQuote:
      'We used to guess who owed what by the end of the trip. Now we don’t have to.',
    proofQuoteAttribution: 'Shubham, after the Goa trip above',

    // Final CTA
    finalCtaHeading: 'Set up your first group in about a minute.',
    finalCtaBody:
      'No credit card, no app to download — everything stays right here in your browser.',
    finalCtaButton: 'Get started',

    footer:
      'Splitmate keeps everything in this browser. Nothing is sent anywhere.',
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
    testAccountsPassword: 'password123',
    testAccounts: [
      'priya.sharma@example.com',
      'rahul.verma@example.com',
      'ananya.iyer@example.com',
      'karan.mehta@example.com',
    ],
    welcomeToast: 'Welcome back!',
    forgotPasswordLink: 'Forgot password?',
  },

  forgotPassword: {
    title: 'Reset your password',
    intro: 'Enter your email and we’ll send you a link to set a new one.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    submit: 'Send reset link',
    footerPrompt: 'Remembered it?',
    footerLink: 'Sign in',
    sentTitle: 'Check your inbox',
    sentBody: (email) =>
      `If ${email} has an account, a reset link is on its way.`,
    sentToast: 'Reset link sent',
    backToSignIn: 'Back to sign in',
  },

  resetPassword: {
    title: 'Set a new password',
    intro: 'Choose a new password for your account.',
    passwordLabel: 'New password',
    passwordPlaceholder: '••••••••',
    passwordHint: 'At least 6 characters.',
    confirmLabel: 'Confirm password',
    confirmPlaceholder: '••••••••',
    submit: 'Update password',
    successToast: 'Password updated',
    mismatchError: 'Passwords don’t match.',
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
    expenseSuffix: (count) =>
      ` · ${count} ${count === 1 ? 'expense' : 'expenses'}`,
  },

  createGroup: {
    back: '← Groups',
    heading: 'New group',
    intro:
      'Name it after the thing you’re splitting, then add everyone who’s in on it.',
    groupNameLabel: 'Group name',
    groupNamePlaceholder: 'Goa trip',
    membersLabel: 'Add members by email',
    membersHint:
      'One at a time. People who haven’t signed up yet join the group when they register.',
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
    expensesHeading: (count) =>
      count > 0 ? `Expenses (${count})` : 'Expenses',
    emptyExpensesTitle: 'Nothing on the tab yet',
    emptyExpensesBody:
      'Add the first thing someone paid for and Splitmate will keep the balances from there.',
    payerLine: (payer, date) => `${payer} paid · ${date} · `,
    customShare: (count) =>
      `${count} custom ${count === 1 ? 'share' : 'shares'}`,
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
    paymentsClear: (count) =>
      `${count} ${count === 1 ? 'payment' : 'payments'} clears the whole group.`,
    notFoundTitle: 'That group isn’t here',
    notFoundBody:
      'It may have been removed, or the link belongs to a group you’re not part of.',
    backToGroups: 'Back to groups',
    expenseAddedToast: 'Expense added',
    expenseDeletedToast: 'Expense deleted',
    settleUpButton: 'Settle up',
    settlementRecordedToast: 'Settlement recorded',
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
    invalidShareError:
      'Enter a valid amount for everyone sharing this expense.',
    remainderPositiveError: (amount) => `${amount} still needs to be assigned.`,
    remainderNegativeError: (amount) =>
      `The shares add up to ${amount} more than the total.`,
    tallyEqual: (count) =>
      `Split equally between ${count} ${count === 1 ? 'person' : 'people'}`,
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
    confirmEmailNotice: 'Check your inbox to confirm your email, then sign in.',
    resetLinkExpiredError:
      'This reset link is invalid or has expired. Request a new one.',
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
