// Monthly balance: expected income (students' fees in the months they're enrolled) - expenses.
// Run with:  node --test tests/monthly-summary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeMonth, balanceMonthKeys, lastCountedMonth, defaultStopDate } from '../src/lib/monthlySummary.js';

const students = [
  { id: 'a', enrollment_date: '2026-07-10', monthly_fee: 50 },
  { id: 'b', enrollment_date: '2026-09-28', monthly_fee: '40' }, // joined late in Sept: still counts for Sept
  { id: 'c', enrollment_date: '2026-08-01', monthly_fee: null }, // no fee set
];
const payments = [
  { student_id: 'a', date_paid: '2026-09-02', amount: 50 },
  { student_id: 'x', date_paid: '2026-09-03', amount: 99 }, // student not in the list - still real money in
  { student_id: 'b', date_paid: '2026-10-01', amount: 40 }, // other month
];
const expenses = [
  { category: 'salary', date_paid: '2026-09-30', amount: 60 },
  { category: 'rent', date_paid: '2026-09-15', amount: '20' },
  { category: 'salary', date_paid: '2026-08-30', amount: 500 }, // other month
];

test('expected income uses students’ fees, not recorded payments; collected is every payment received', () => {
  const s = summarizeMonth('2026-09', { students, payments, expenses });
  assert.equal(s.studentCount, 3);
  assert.equal(s.expected, 90);
  assert.equal(s.missingFee, 1);
  assert.equal(s.collected, 149);
  assert.equal(s.stillToCollect, 0);
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

// The example from the academy: enrolled and paid 22 Oct (covers 22 Oct -> 22 Nov),
// doesn't renew on 22 Nov, staff archive them on 25 Nov.
const leaver = { id: 'L', enrollment_date: '2026-10-22', monthly_fee: 100 };
const leaverPaid = [{ student_id: 'L', date_paid: '2026-10-22', amount: 100 }];
const expectedFor = (student, month) => summarizeMonth(month, { students: [student], payments: leaverPaid, expenses: [] }).expected;

test('archived with the suggested date: counted in October, not from 22 Nov on', () => {
  assert.equal(defaultStopDate(leaver, leaverPaid), '2026-11-22');
  const archived = { ...leaver, active: false, stopped_from: '2026-11-22' };
  assert.equal(expectedFor(archived, '2026-10'), 100);
  assert.equal(expectedFor(archived, '2026-11'), 0);
  assert.equal(expectedFor(archived, '2026-12'), 0);
  assert.equal(lastCountedMonth(leaver, leaverPaid, '2026-11-22'), '2026-10');
});

test('the chosen date is respected: after the 22 Nov renewal, November counts too', () => {
  const archived = { ...leaver, active: false, stopped_from: '2026-11-25' };
  assert.equal(expectedFor(archived, '2026-11'), 100);
  assert.equal(expectedFor(archived, '2026-12'), 0);
  assert.equal(lastCountedMonth(leaver, leaverPaid, '2026-11-25'), '2026-11');
  assert.equal(lastCountedMonth(leaver, leaverPaid, '2026-10-22'), null); // stopped on day one: never counted
});

test('students archived before stop dates existed stop at their first unpaid renewal', () => {
  const old = { id: 'O', enrollment_date: '2026-07-22', monthly_fee: 60, active: false }; // no stopped_from
  const paid = [
    { student_id: 'O', date_paid: '2026-07-22', amount: 60 },
    { student_id: 'O', date_paid: '2026-08-22', amount: 60 },
  ];
  const exp = (m) => summarizeMonth(m, { students: [old], payments: paid, expenses: [] }).expected;
  assert.deepEqual(['2026-07', '2026-08', '2026-09'].map(exp), [60, 60, 0]); // due 22 Sep, never paid
});

test('stopping on the enrollment date means never counted, even if the billing day drifted', () => {
  const drifted = { id: 'D', enrollment_date: '2026-07-05', monthly_fee: 50 };
  const paid = [{ student_id: 'D', date_paid: '2026-09-01', amount: 50 }]; // paid late, on the 1st
  assert.equal(lastCountedMonth(drifted, paid, '2026-07-05'), null);
  assert.equal(lastCountedMonth(drifted, paid, '2026-07-06'), '2026-07');
  assert.equal(lastCountedMonth(drifted, paid, '2026-10-01'), '2026-09');
});

test('archiving never changes earlier months', () => {
  const before = summarizeMonth('2026-10', { students: [leaver], payments: leaverPaid, expenses: [] });
  const after = summarizeMonth('2026-10', { students: [{ ...leaver, active: false, stopped_from: '2026-11-22' }], payments: leaverPaid, expenses: [] });
  assert.deepEqual(after, before);
});

test('balance months run from earliest enrollment/expense to now, newest first', () => {
  assert.deepEqual(balanceMonthKeys({ students, expenses }, '2026-09'), ['2026-09', '2026-08', '2026-07']);
  assert.deepEqual(balanceMonthKeys({ students: [], expenses: [] }, '2026-09'), ['2026-09']);
  assert.deepEqual(
    balanceMonthKeys({ students: [{ enrollment_date: '2025-11-05' }], expenses: [] }, '2026-02'),
    ['2026-02', '2026-01', '2025-12', '2025-11'],
  );
});
