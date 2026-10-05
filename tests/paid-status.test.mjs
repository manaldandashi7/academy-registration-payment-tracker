// "Paid" on the level pages: only a real recorded payment that still covers today.
// Run with:  node --test tests/paid-status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStatus, isPaidForCurrentPeriod, isoOf, todayLocalMidnight, addMonthsClamped } from '../src/lib/dateUtils.js';

const today = isoOf(todayLocalMidnight());
const daysAgo = (n) => { const d = todayLocalMidnight(); d.setDate(d.getDate() - n); return isoOf(d); };
const monthAgo = isoOf(addMonthsClamped(today, -1)); // paid exactly 1 month ago -> due today
const paidFor = (student, payments) => isPaidForCurrentPeriod(computeStatus(student, payments));

test('no payment at all is never "paid", even if the first due date is still ahead', () => {
  const newStudent = { id: 'n', enrollment_date: daysAgo(3) };
  assert.equal(computeStatus(newStudent, []).status, 'ok'); // the old "OK" status
  assert.equal(paidFor(newStudent, []), false);
});

test('a payment made this period shows "paid"', () => {
  const s = { id: 's', enrollment_date: daysAgo(200) };
  assert.equal(paidFor(s, [{ student_id: 's', date_paid: daysAgo(5) }]), true);
  // still paid the day before it's due (due in 1 day = "due soon", but covered)
  const almost = isoOf(addMonthsClamped(daysAgo(-1), -1));
  assert.equal(paidFor(s, [{ student_id: 's', date_paid: almost }]), true);
});

test('on the due date it goes back to "record payment", and stays there while overdue', () => {
  const s = { id: 's', enrollment_date: daysAgo(200) };
  assert.equal(paidFor(s, [{ student_id: 's', date_paid: monthAgo }]), false);
  assert.equal(paidFor(s, [{ student_id: 's', date_paid: daysAgo(45) }]), false);
});

test('only this student’s payments count, and the latest one decides', () => {
  const s = { id: 's', enrollment_date: daysAgo(200) };
  assert.equal(paidFor(s, [{ student_id: 'other', date_paid: daysAgo(2) }]), false);
  assert.equal(paidFor(s, [{ student_id: 's', date_paid: daysAgo(60) }, { student_id: 's', date_paid: daysAgo(2) }]), true);
});
