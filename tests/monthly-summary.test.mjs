// Monthly balance: expected income (active students' fees) - expenses.
// Run with:  node --test tests/monthly-summary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeMonth, balanceMonthKeys } from '../src/lib/monthlySummary.js';

const students = [
  { id: 'a', enrollment_date: '2026-07-10', monthly_fee: 50 },
  { id: 'b', enrollment_date: '2026-09-28', monthly_fee: '40' }, // joined late in Sept: still counts for Sept
  { id: 'c', enrollment_date: '2026-08-01', monthly_fee: null }, // no fee set
];
const payments = [
  { student_id: 'a', date_paid: '2026-09-02', amount: 50 },
  { student_id: 'x', date_paid: '2026-09-03', amount: 99 }, // archived student - not in `students`
  { student_id: 'b', date_paid: '2026-10-01', amount: 40 }, // other month
];
const expenses = [
  { category: 'salary', date_paid: '2026-09-30', amount: 60 },
  { category: 'rent', date_paid: '2026-09-15', amount: '20' },
  { category: 'salary', date_paid: '2026-08-30', amount: 500 }, // other month
];

test('expected income uses fees of active students, not recorded payments', () => {
  const s = summarizeMonth('2026-09', { students, payments, expenses });
  assert.equal(s.studentCount, 3);
  assert.equal(s.expected, 90);
  assert.equal(s.missingFee, 1);
  assert.equal(s.collected, 50); // archived student's 99 not counted
  assert.equal(s.stillToCollect, 40);
});

test('all expenses of the month are subtracted, salaries shown apart', () => {
  const s = summarizeMonth('2026-09', { students, payments, expenses });
  assert.equal(s.salaries, 60);
  assert.equal(s.otherExpenses, 20);
  assert.equal(s.left, 10);
});

test('students count only from the month they enrolled; negative balance allowed', () => {
  const aug = summarizeMonth('2026-08', { students, payments, expenses });
  assert.equal(aug.studentCount, 2); // a and c; b enrolled in Sept
  assert.equal(aug.expected, 50);
  assert.equal(aug.left, -450);
  assert.equal(aug.stillToCollect, 50);
});

test('balance months run from earliest enrollment/expense to now, newest first', () => {
  assert.deepEqual(balanceMonthKeys({ students, expenses }, '2026-09'), ['2026-09', '2026-08', '2026-07']);
  assert.deepEqual(balanceMonthKeys({ students: [], expenses: [] }, '2026-09'), ['2026-09']);
  assert.deepEqual(
    balanceMonthKeys({ students: [{ enrollment_date: '2025-11-05' }], expenses: [] }, '2026-02'),
    ['2026-02', '2026-01', '2025-12', '2025-11'],
  );
});
