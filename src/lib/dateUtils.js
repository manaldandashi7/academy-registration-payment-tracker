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

export function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtMonthYear(d) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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

/** { dueDate, diffDays, status, lastPaid } for one student */
export function computeStatus(student, payments) {
  const lastPaid = lastPaymentFor(payments, student.id);
  const base = lastPaid || student.enrollment_date;
  const dueDate = addMonthsClamped(base, 1);
  const today = todayLocalMidnight();
  const diffDays = Math.round((dueDate - today) / 86400000);
  let status = 'ok';
  if (diffDays < 0) status = 'overdue';
  else if (diffDays <= REMINDER_WINDOW_DAYS) status = 'duesoon';
  return { dueDate, diffDays, status, lastPaid };
}
