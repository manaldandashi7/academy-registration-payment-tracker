import { monthKeyOf, currentMonthKey } from './dateUtils.js';

// ---- the monthly balance: what the academy should keep each month ----
//
// Income here is *expected* income - the sum of every active student's
// monthly fee - not the payments actually recorded, so the balance shows
// what the month is worth regardless of who has paid yet. What was really
// collected is reported alongside it, for "still to collect".
//
// `students` must be the active students only: archived ones are left out.
// A student counts from the month they enrolled in (the whole month, even
// if they joined partway through). Archived-date history isn't tracked yet,
// so past months use today's active list.

const toNumber = (v) => {
  const n = Number(v);
  return v == null || v === '' || Number.isNaN(n) ? null : n;
};

/** Sums of one month. `monthKey` is "YYYY-MM". */
export function summarizeMonth(monthKey, { students, payments, expenses }) {
  let expected = 0;
  let studentCount = 0;
  let missingFee = 0;
  for (const s of students) {
    if (!s.enrollment_date || monthKeyOf(s.enrollment_date) > monthKey) continue;
    studentCount += 1;
    const fee = toNumber(s.monthly_fee);
    if (fee == null) missingFee += 1;
    else expected += fee;
  }

  const activeIds = new Set(students.map((s) => s.id));
  let collected = 0;
  for (const p of payments) {
    if (!p.date_paid || monthKeyOf(p.date_paid) !== monthKey || !activeIds.has(p.student_id)) continue;
    collected += toNumber(p.amount) || 0;
  }

  let salaries = 0;
  let otherExpenses = 0;
  for (const e of expenses) {
    if (!e.date_paid || monthKeyOf(e.date_paid) !== monthKey) continue;
    const amt = toNumber(e.amount) || 0;
    if (e.category === 'salary') salaries += amt;
    else otherExpenses += amt;
  }

  const totalExpenses = salaries + otherExpenses;
  return {
    monthKey,
    studentCount,
    missingFee,
    expected,
    collected,
    stillToCollect: Math.max(0, expected - collected),
    salaries,
    otherExpenses,
    totalExpenses,
    left: expected - totalExpenses,
  };
}

/** Every month from the earliest enrollment/expense up to this month, newest first. */
export function balanceMonthKeys({ students, expenses }, nowKey = currentMonthKey()) {
  const starts = [
    ...students.map((s) => s.enrollment_date),
    ...expenses.map((e) => e.date_paid),
  ].filter(Boolean).map(monthKeyOf).filter((k) => k <= nowKey);
  if (starts.length === 0) return [nowKey];

  let [y, m] = starts.reduce((a, b) => (a < b ? a : b)).split('-').map(Number);
  const keys = [];
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    keys.push(key);
    if (key >= nowKey) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return keys.reverse();
}
