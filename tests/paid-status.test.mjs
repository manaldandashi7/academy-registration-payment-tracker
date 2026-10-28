// Due dates and "Paid" on the level pages.
// Billing follows the enrollment day; each payment pays one month.
// Run with:  node --test tests/paid-status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStatus, isPaidForCurrentPeriod, isoOf, todayLocalMidnight, addMonthsClamped } from '../src/lib/dateUtils.js';

const due = (student, payments) => isoOf(computeStatus(student, payments).dueDate);
const pay = (date) => ({ student_id: 'isa', date_paid: date });
const isa = { id: 'isa', enrollment_date: '2026-10-01' }; // the academy's example

test('enrolled 1 Oct, paid late on 12 Oct: due 1 Nov (not 12 Nov)', () => {
  assert.equal(due(isa, [pay('2026-10-12')]), '2026-11-01');
});

test('paying late again does not move the day: second payment on 5 Nov -> due 1 Dec', () => {
  assert.equal(due(isa, [pay('2026-10-12'), pay('2026-11-05')]), '2026-12-01');
});

test('each payment is one month, so paying two months at once -> due 1 Dec', () => {
  assert.equal(due(isa, [pay('2026-10-01'), pay('2026-10-01')]), '2026-12-01');
});

test('no payment yet: the first month is due on the enrollment date', () => {
  assert.equal(due(isa, []), '2026-10-01');
});

test('editing the enrollment date moves the due date immediately', () => {
  assert.equal(due({ ...isa, enrollment_date: '2026-10-15' }, [pay('2026-10-12')]), '2026-11-15');
});

test('the enrollment day is kept across short months', () => {
  const s = { id: 'isa', enrollment_date: '2026-01-31' };
  assert.equal(due(s, [pay('2026-01-31')]), '2026-02-28');
  assert.equal(due(s, [pay('2026-01-31'), pay('2026-02-28')]), '2026-03-31'); // back to the 31st
});

test('only this student’s payments count', () => {
  assert.equal(due(isa, [{ student_id: 'other', date_paid: '2026-10-01' }]), '2026-10-01');
});

// "Paid" relative to today
const today = isoOf(todayLocalMidnight());
const monthsFromToday = (n) => isoOf(addMonthsClamped(today, n));
const daysFromToday = (n) => { const d = todayLocalMidnight(); d.setDate(d.getDate() + n); return isoOf(d); };
const paidNow = (student, payments) => isPaidForCurrentPeriod(computeStatus(student, payments));

test('"Paid" only with a real payment whose month still covers today', () => {
  // enrolled 10 days ago: no payment -> not paid (and already due)
  const fresh = { id: 'isa', enrollment_date: daysFromToday(-10) };
  assert.equal(paidNow(fresh, []), false);
  assert.equal(computeStatus(fresh, []).status, 'overdue');
  // one payment, made late, still covers this month -> paid
  assert.equal(paidNow(fresh, [pay(daysFromToday(-2))]), true);
});

test('on the due date it goes back to "record payment"', () => {
  // enrolled exactly one month ago, one payment -> next month due today
  const s = { id: 'isa', enrollment_date: monthsFromToday(-1) };
  assert.equal(computeStatus(s, [pay(monthsFromToday(-1))]).diffDays, 0);
  assert.equal(paidNow(s, [pay(monthsFromToday(-1))]), false);
  // the day before, it was still paid
  const s2 = { id: 'isa', enrollment_date: isoOf(addMonthsClamped(daysFromToday(1), -1)) };
  assert.equal(paidNow(s2, [pay(s2.enrollment_date)]), true);
});
