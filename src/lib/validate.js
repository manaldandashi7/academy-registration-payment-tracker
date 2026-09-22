import { EXPENSE_CATEGORY_IDS } from './expenseCategories.js';

// Input validation + sanitising shared by every form.
//
// Each validator returns { value } on success or { error: { key, params } } on
// failure. `key` is a dictionary key from i18n.jsx, so messages follow the
// current language. This is defence in depth: the database also enforces its own
// limits (see supabase/security_hardening.sql) because client code can be bypassed.

export const LIMITS = {
  name: 100,
  klass: 60,
  address: 200,
  notes: 500,
  month: 40,
  payee: 100,
  academyName: 80,
  contact: 80,
  email: 254,
  passwordBytes: 72, // bcrypt (used by Supabase Auth) ignores everything past 72 bytes
  maxAmount: 10_000_000,
  logoBytes: 2 * 1024 * 1024,
};

// Control characters (except tab/newline, handled per field), zero-width and
// bidi-override characters. The last group is used for "Trojan Source"-style
// spoofing, where text is displayed in a different order than it is stored.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const ZERO_WIDTH = /[​⁠﻿]/g;
const BIDI_OVERRIDES = /[\u202A-\u202E\u2066-\u2069]/g;

const fail = (key, params = {}) => ({ error: { key, params } });

/** Turns an error from a validator into a translated sentence. */
export function errText(t, err) {
  const params = { ...err.params };
  if (params.fieldKey) params.field = t(params.fieldKey);
  return t(err.key, params);
}

/** Normalises and cleans free text. Never throws. */
export function cleanText(value, { multiline = false } = {}) {
  let s = String(value ?? '').normalize('NFC');
  s = s.replace(CONTROL_CHARS, '').replace(ZERO_WIDTH, '').replace(BIDI_OVERRIDES, '');
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}

export function text(value, { fieldKey, max, required = false, multiline = false }) {
  const s = cleanText(value, { multiline });
  if (!s) return required ? fail('v_required', { fieldKey }) : { value: '' };
  if (s.length > max) return fail('v_too_long', { fieldKey, max });
  return { value: s };
}

/** Phone numbers: digits with an optional leading +, spaces, dashes, dots, brackets. */
export function phone(value, { required = false, fieldKey = 'phone' } = {}) {
  const s = cleanText(value);
  if (!s) return required ? fail('v_required', { fieldKey }) : { value: '' };
  const digits = s.replace(/\D/g, '');
  if (!/^\+?[0-9 ()\-.]{6,25}$/.test(s) || digits.length < 7 || digits.length > 15) return fail('v_phone');
  return { value: s };
}

/** Optional money amount: 0 - 10,000,000 with at most 2 decimals. Returns a number or null. */
export function amount(value) {
  const s = String(value ?? '').trim();
  if (!s) return { value: null };
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) return fail('v_amount');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > LIMITS.maxAmount) return fail('v_amount');
  return { value: n };
}

/** ISO date (YYYY-MM-DD) that is a real calendar day between 2000 and a year from now. */
export function isoDate(value, { fieldKey = 'enrollment_date' } = {}) {
  const s = String(value ?? '').trim();
  if (!s) return fail('v_required', { fieldKey });
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return fail('v_date');
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return fail('v_date');
  const max = new Date();
  max.setDate(max.getDate() + 366);
  if (y < 2000 || date > max) return fail('v_date_range');
  return { value: s };
}

export function email(value) {
  const s = cleanText(value).toLowerCase();
  if (!s) return fail('v_required', { fieldKey: 'email' });
  if (s.length > LIMITS.email || !/^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"]+\.[^\s@,;:<>()[\]\\"]{2,}$/.test(s) || s.includes('..')) {
    return fail('v_email');
  }
  return { value: s };
}

export function passwordLength(value) {
  const bytes = new TextEncoder().encode(String(value ?? '')).length;
  return bytes > LIMITS.passwordBytes ? fail('v_password_long') : { value };
}

const IMAGE_TYPES = {
  'image/png': { ext: 'png', magic: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]] },
  'image/jpeg': { ext: 'jpg', magic: [[0, [0xff, 0xd8, 0xff]]] },
  'image/webp': { ext: 'webp', magic: [[0, [0x52, 0x49, 0x46, 0x46]], [8, [0x57, 0x45, 0x42, 0x50]]] },
};

/**
 * Checks a chosen logo file: allowed type, size, and that the real bytes match the
 * claimed type (so a script renamed to .png is rejected). SVG is deliberately not
 * allowed because SVG files can carry scripts. The returned extension comes from
 * the verified type, never from the user-supplied file name.
 */
export async function image(file) {
  if (!file) return fail('v_file_type');
  const spec = IMAGE_TYPES[file.type];
  if (!spec) return fail('v_file_type');
  if (file.size > LIMITS.logoBytes || file.size === 0) return fail('v_file_size');
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = spec.magic.every(([offset, bytes]) => bytes.every((b, i) => head[offset + i] === b));
  if (!matches) return fail('v_file_type');
  return { value: { ext: spec.ext, contentType: file.type } };
}

// ---- whole-form validators -------------------------------------------------

export function validateStudent({ name, phone: rawPhone, klass, address, enrollmentDate, level }) {
  const n = text(name, { fieldKey: 'student_name', max: LIMITS.name, required: true });
  if (n.error) return n;
  const p = phone(rawPhone, { required: true, fieldKey: 'parent_whatsapp' });
  if (p.error) return p;
  const c = text(klass, { fieldKey: 'class_label', max: LIMITS.klass, required: true });
  if (c.error) return c;
  const a = text(address, { fieldKey: 'address_optional', max: LIMITS.address });
  if (a.error) return a;
  const d = isoDate(enrollmentDate);
  if (d.error) return d;
  const lv = Number(level);
  if (![1, 2, 3, 4].includes(lv)) return fail('v_level');
  return { value: { name: n.value, phone: p.value, class: c.value, address: a.value, enrollment_date: d.value, level: lv } };
}

export function validatePayment({ datePaid, amount: rawAmount, monthCovered, notes }) {
  const d = isoDate(datePaid, { fieldKey: 'date_paid' });
  if (d.error) return d;
  const a = amount(rawAmount);
  if (a.error) return a;
  const m = text(monthCovered, { fieldKey: 'month_covered', max: LIMITS.month, required: true });
  if (m.error) return m;
  const nt = text(notes, { fieldKey: 'notes_optional', max: LIMITS.notes, multiline: true });
  if (nt.error) return nt;
  return { value: { date_paid: d.value, amount: a.value, month_covered: m.value, notes: nt.value } };
}

export function validateExpense({ category, payee, amount: rawAmount, datePaid, notes }) {
  if (!EXPENSE_CATEGORY_IDS.includes(category)) return fail('v_category');
  const p = text(payee, { fieldKey: 'col_payee', max: LIMITS.payee });
  if (p.error) return p;
  const a = amount(rawAmount);
  if (a.error) return a;
  if (a.value === null) return fail('v_required', { fieldKey: 'expense_amount' });
  const d = isoDate(datePaid, { fieldKey: 'expense_date' });
  if (d.error) return d;
  const nt = text(notes, { fieldKey: 'notes_optional', max: LIMITS.notes, multiline: true });
  if (nt.error) return nt;
  return { value: { category, payee: p.value, amount: a.value, date_paid: d.value, notes: nt.value } };
}

export function validateProfile({ name, ownerName, phone: rawPhone, address }) {
  const n = text(name, { fieldKey: 'academy_name', max: LIMITS.academyName });
  if (n.error) return n;
  const o = text(ownerName, { fieldKey: 'contact_person', max: LIMITS.contact });
  if (o.error) return o;
  const p = phone(rawPhone, { fieldKey: 'phone' });
  if (p.error) return p;
  const a = text(address, { fieldKey: 'address', max: LIMITS.address });
  if (a.error) return a;
  return { value: { academy_name: n.value, owner_name: o.value, phone: p.value, address: a.value } };
}
