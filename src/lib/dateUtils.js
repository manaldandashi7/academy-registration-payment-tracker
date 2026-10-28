export const REMINDER_WINDOW_DAYS = 3;

export function todayLocalMidnight() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseISODateLocal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Adds n months to an ISO date, clamping to the last day of the
 * target month when the original day doesn't exist there (mirrors
 * spreadsheet EDATE behavior, e.g. Jan 31 + 1 month -> Feb 28). */
export function addMonthsClamped(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  let monthIndex = m - 1 + n;
  let year = y + Math.floor(monthIndex / 12);
  monthIndex = ((monthIndex % 12) + 12) % 12;
  const daysInTarget = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(d, daysInTarget);
  return new Date(year, monthIndex, day);
}

export function fmtDate(d, locale) {
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtMonthYear(d, locale) {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

// ---- month grouping helpers, shared by the income and expenses reports ----

export function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export function monthLabel(key, locale) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function monthKeyFromOffset(monthsAgo) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey() {
  return monthKeyFromOffset(0);
}

export function lastMonthKey() {
  return monthKeyFromOffset(1);
}

/** The current month and the 5 before it, oldest first. */
export function last6MonthKeys() {
  return [5, 4, 3, 2, 1, 0].map(monthKeyFromOffset);
}

/** last payment (max date_paid) for a student, from a flat payments array */
export function lastPaymentFor(payments, studentId) {
  let latest = null;
  for (const p of payments) {
    if (p.student_id !== studentId) continue;
    if (!latest || p.date_paid > latest) latest = p.date_paid;
  }
  return latest;
}

/** How many payments a student has - each payment pays for one month. */
export function paymentCountFor(payments, studentId) {
  let n = 0;
  for (const p of payments) if (p.student_id === studentId) n += 1;
  return n;
}

/** { dueDate, diffDays, status, lastPaid, paidCount } for one student.
 *
 * Billing always follows the enrollment day: each payment pays one month,
 * so the next unpaid month starts at enrollment date + (number of payments)
 * months. When a payment was made (early or late) doesn't move it - enrolled
 * 1 Oct, paid 12 Oct -> due 1 Nov; paid again 5 Nov -> due 1 Dec. Editing
 * the enrollment date moves every date with it. With no payment yet, the
 * first month is due on the enrollment date itself. */
export function computeStatus(student, payments) {
  const lastPaid = lastPaymentFor(payments, student.id);
  const paidCount = paymentCountFor(payments, student.id);
  // Always from the enrollment date (not chained month to month), so the day
  // stays put: enrolled 31 Jan -> 28 Feb, 31 Mar, 30 Apr...
  const dueDate = addMonthsClamped(student.enrollment_date, paidCount);
  const today = todayLocalMidnight();
  const diffDays = Math.round((dueDate - today) / 86400000);
  let status = 'ok';
  if (diffDays < 0) status = 'overdue';
  else if (diffDays <= REMINDER_WINDOW_DAYS) status = 'duesoon';
  return { dueDate, diffDays, status, lastPaid, paidCount };
}

/** True only when the student has at least one real recorded payment and
 * their paid months still cover today. On the due date it turns false. */
export function isPaidForCurrentPeriod(info) {
  return info.paidCount > 0 && info.diffDays > 0;
}
