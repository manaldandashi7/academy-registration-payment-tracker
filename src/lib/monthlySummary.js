import { monthKeyOf, currentMonthKey, computeStatus, addMonthsClamped, isoOf } from './dateUtils.js';

// ---- the monthly balance: what the academy should keep each month ----
//
// Income here is *expected* income - each student's monthly fee in every
// month they're enrolled - not the payments actually recorded, so the balance
// shows what the month is worth regardless of who has paid yet. What was
// really collected is reported alongside it, for "still to collect".
//
// Students don't run on calendar months: each renews on their own day (e.g.
// the 22nd), roughly once per calendar month. So:
//   - an active student counts in every month from the month they enrolled;
//   - an archived student counts only in months whose renewal falls before
//     their stop date - the date staff picked when archiving (`stopped_from`),
//     or, for students archived before that existed, their first unpaid
//     renewal (last payment + 1 month).
// That way archiving someone never changes the months they were really here.

const toNumber = (v) => {
  const n = Number(v);
  return v == null || v === '' || Number.isNaN(n) ? null : n;
};

const isArchived = (s) => s.active === false;

function monthsBetween(fromKey, toKey) {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** The date an archived student stops being expected, if staff didn't pick one: their first unpaid renewal. */
export function defaultStopDate(student, payments) {
  return isoOf(computeStatus(student, payments).dueDate);
}

/** What the balance needs to know about one student, worked out once. */
export function studentPlan(student, payments) {
  const plan = { student, startKey: monthKeyOf(student.enrollment_date), stopIso: null, anchorIso: null };
  if (isArchived(student)) {
    // Renewal day = the student's own billing day, same as the due dates shown on the level pages.
    plan.anchorIso = defaultStopDate(student, payments);
    plan.stopIso = student.stopped_from || plan.anchorIso;
  }
  return plan;
}

/** Does this student's fee count as expected in this month ("YYYY-MM")? */
export function countsInMonth(plan, monthKey) {
  if (monthKey < plan.startKey) return false;
  if (!plan.stopIso) return true;
  // In the enrollment month the "renewal" is the enrollment itself - a
  // billing day that drifted earlier (late payments) can't put it before that.
  const renewal = isoOf(addMonthsClamped(plan.anchorIso, monthsBetween(monthKeyOf(plan.anchorIso), monthKey)));
  return (monthKey === plan.startKey && renewal < plan.student.enrollment_date ? plan.student.enrollment_date : renewal) < plan.stopIso;
}

/** The last month a student would be counted in with this stop date, or null if none. */
export function lastCountedMonth(student, payments, stopIso) {
  if (!student.enrollment_date || !stopIso) return null;
  const plan = studentPlan({ ...student, active: false, stopped_from: stopIso }, payments);
  let key = monthKeyOf(stopIso);
  for (let i = 0; i < 3 && key >= plan.startKey; i += 1) { // the answer is the stop month or one before it
    if (countsInMonth(plan, key)) return key;
    const [y, m] = key.split('-').map(Number);
    key = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  }
  return null;
}

/** Plans for every student - pass the result to summarizeMonth() when summarizing many months. */
export function buildPlans(students, payments) {
  return students.filter((s) => s.enrollment_date).map((s) => studentPlan(s, payments));
}

/** Sums of one month. `monthKey` is "YYYY-MM"; `students` includes archived ones. */
export function summarizeMonth(monthKey, { students, payments, expenses, plans = buildPlans(students, payments) }) {
  let expected = 0;
  let studentCount = 0;
  let missingFee = 0;
  for (const plan of plans) {
    if (!countsInMonth(plan, monthKey)) continue;
    studentCount += 1;
    const fee = toNumber(plan.student.monthly_fee);
    if (fee == null) missingFee += 1;
    else expected += fee;
  }

  // Every payment received this month, archived students' included - it's real money in.
  let collected = 0;
  for (const p of payments) {
    if (!p.date_paid || monthKeyOf(p.date_paid) !== monthKey) continue;
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
