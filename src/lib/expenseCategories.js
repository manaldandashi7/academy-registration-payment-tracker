// Shared between the expense form, the expenses list and validation, so
// there is exactly one place that defines what a valid category is.
export const EXPENSE_CATEGORIES = [
  { id: 'salary', icon: 'user' },
  { id: 'rent', icon: 'home' },
  { id: 'utilities', icon: 'zap' },
  { id: 'supplies', icon: 'box' },
  { id: 'maintenance', icon: 'wrench' },
  { id: 'other', icon: 'dots' },
];

export const EXPENSE_CATEGORY_IDS = EXPENSE_CATEGORIES.map((c) => c.id);
