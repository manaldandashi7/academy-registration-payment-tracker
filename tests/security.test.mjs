// Attack-payload tests for the input validation layer.
// Run with:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  cleanText, text, phone, amount, isoDate, email, passwordLength, image,
  validateStudent, validatePayment, validateProfile, validateExpense, LIMITS,
} from '../src/lib/validate.js';
import { normalizePhoneForWa, buildReminderMessage } from '../src/lib/whatsapp.js';

const XSS_AND_INJECTION = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(document.cookie)>',
  "'; DROP TABLE students; --",
  "' OR '1'='1",
  '"); DELETE FROM payments; --',
  '${7*7}',
  '{{constructor.constructor("alert(1)")()}}',
  'javascript:alert(1)',
  '<svg/onload=alert(1)>',
  '../../../etc/passwd',
];

test('injection strings stay inert text and are rendered escaped (no live HTML)', () => {
  for (const payload of XSS_AND_INJECTION) {
    const r = text(payload, { fieldKey: 'student_name', max: LIMITS.name, required: true });
    assert.equal(r.error, undefined, `should be accepted as plain text: ${payload}`);
    // Exactly how React renders a student's name in the dashboard and tables:
    const html = renderToStaticMarkup(createElement('div', { className: 'student-name' }, r.value));
    // Everything between the wrapper tags must be escaped text: no raw "<" or ">" left,
    // so the browser can never treat any of it as an element or attribute.
    const inner = html.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    assert.ok(!inner.includes('<') && !inner.includes('>'), `unescaped markup leaked for: ${payload}\n${html}`);
  }
});

test('control characters, null bytes, zero-width and bidi overrides are stripped', () => {
  assert.equal(cleanText('a\u0000b\u0007c'), 'abc');
  assert.equal(cleanText('exe.\u202Egpj'), 'exe.gpj');
  assert.equal(cleanText('\u2066hidden\u2069 text'), 'hidden text');
  assert.equal(cleanText('ab​cd﻿'), 'abcd');
  assert.equal(cleanText('  many   spaces \n\t here '), 'many spaces here');
  // Arabic joiners that real Arabic/Persian text needs must survive
  assert.equal(cleanText('می‌خواهم'), 'می‌خواهم');
});

test('length limits are enforced', () => {
  assert.ok(text('x'.repeat(LIMITS.name + 1), { fieldKey: 'student_name', max: LIMITS.name }).error);
  assert.ok(!text('x'.repeat(LIMITS.name), { fieldKey: 'student_name', max: LIMITS.name }).error);
  assert.ok(text('x'.repeat(100000), { fieldKey: 'notes_optional', max: LIMITS.notes }).error);
});

test('required fields cannot be empty or whitespace only', () => {
  for (const v of ['', '   ', '​​', '\u0000', undefined, null]) {
    assert.ok(text(v, { fieldKey: 'student_name', max: 100, required: true }).error, `accepted: ${JSON.stringify(v)}`);
  }
});

test('Arabic and other real names are accepted unchanged', () => {
  for (const n of ['ليلى حداد', "Sarah O'Brien", 'Zoë Müller-Smith', '李小龍']) {
    assert.equal(text(n, { fieldKey: 'student_name', max: 100, required: true }).value, n);
  }
});

test('phone numbers: attacks rejected, real formats accepted', () => {
  const bad = ['+961"&text=hack', '../../etc', '123', '+9613<script>', '1'.repeat(30), 'call me', "+961'; DROP", '++961 3 123 456', '+961 3 123 456 ext'];
  for (const p of bad) assert.ok(phone(p, { required: true }).error, `accepted: ${p}`);
  for (const p of ['+961 3 123 456', '03-123456', '(01) 234 5678', '+9613123456', '+1 (415) 555-2671']) {
    assert.ok(!phone(p, { required: true }).error, `rejected: ${p}`);
  }
});

test('WhatsApp reminder message is always Arabic, for parents, regardless of the staff UI language', () => {
  const student = { name: 'Layla Haddad', class: 'Grade 3' };
  const dueDate = new Date(2026, 8, 21);
  for (const status of ['overdue', 'duesoon']) {
    const msg = buildReminderMessage('Mahara Academy', student, { status, dueDate });
    assert.ok(/[؀-ۿ]/.test(msg), `not Arabic: ${msg}`);
    assert.ok(msg.includes('Layla Haddad'), 'missing student name');
    assert.ok(msg.includes('Mahara Academy'), 'missing academy name');
  }
});

test('WhatsApp link only ever contains digits from the phone number', () => {
  for (const p of ['+961"&text=hack&x=', '961 3 123 456?redirect=evil.com', '../..//', '<script>1</script>']) {
    assert.match(normalizePhoneForWa(p), /^\d*$/);
  }
});

test('amounts: negatives, huge, scientific, hex, NaN and extra decimals rejected', () => {
  for (const a of ['-5', '1e9', '1e2', 'NaN', 'Infinity', '0x10', '1,000', '99999999999', '1.234', '5 OR 1=1', '50; DROP']) {
    assert.ok(amount(a).error, `accepted: ${a}`);
  }
  assert.equal(amount('').value, null);
  assert.equal(amount('50').value, 50);
  assert.equal(amount('0').value, 0);
  assert.equal(amount('12.5').value, 12.5);
});

test('dates: impossible, out-of-range and malformed values rejected', () => {
  for (const d of ['2026-02-30', '1999-12-31', '2100-01-01', '2026-9-1', "'; --", '2026-13-01', '', '20260101', '<script>']) {
    assert.ok(isoDate(d).error, `accepted: ${d}`);
  }
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  assert.ok(!isoDate(iso).error);
});

test('emails: header injection, lists, brackets and overlong values rejected', () => {
  const bad = ['a@b', 'a b@c.com', 'a@b..com', '<x>@y.com', 'x@y.com,z@w.com', 'x@y.com\nBcc: evil@e.com', `${'a'.repeat(250)}@x.com`, '"quoted"@x.com', ''];
  for (const e of bad) assert.ok(email(e).error, `accepted: ${JSON.stringify(e)}`);
  assert.equal(email('  Name@Example.COM ').value, 'name@example.com');
});

test('very long passwords rejected (bcrypt only reads 72 bytes)', () => {
  assert.ok(passwordLength('a'.repeat(73)).error);
  assert.ok(passwordLength('ع'.repeat(40)).error); // 80 bytes
  assert.ok(!passwordLength('a'.repeat(72)).error);
});

const file = (bytes, type, name = 'logo.png') => new File([new Uint8Array(bytes)], name, { type });
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0];
const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0];

test('logo upload: real images accepted, extension comes from content not file name', async () => {
  assert.equal((await image(file(PNG, 'image/png', '../../evil.php'))).value.ext, 'png');
  assert.equal((await image(file(JPG, 'image/jpeg', 'x.exe'))).value.ext, 'jpg');
  assert.equal((await image(file(WEBP, 'image/webp'))).value.ext, 'webp');
});

test('logo upload: SVG, scripts, disguised files, oversize and empty files rejected', async () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
  assert.ok((await image(file(svg, 'image/svg+xml', 'logo.svg'))).error, 'svg accepted');
  assert.ok((await image(file(svg, 'image/png', 'logo.png'))).error, 'svg disguised as png accepted');
  const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');
  assert.ok((await image(file(html, 'image/jpeg', 'logo.jpg'))).error, 'html disguised as jpeg accepted');
  assert.ok((await image(file(PNG, 'image/gif', 'a.gif'))).error, 'gif accepted');
  assert.ok((await image(file(PNG, 'application/x-msdownload', 'a.exe'))).error, 'exe accepted');
  assert.ok((await image(file([], 'image/png'))).error, 'empty accepted');
  const big = new Uint8Array(LIMITS.logoBytes + 1);
  big.set(PNG);
  assert.ok((await image(new File([big], 'big.png', { type: 'image/png' }))).error, 'oversize accepted');
  assert.ok((await image(null)).error, 'null accepted');
});

test('whole student form: valid data passes and is cleaned, attacks fail', () => {
  const ok = validateStudent({
    name: '  ليلى \u202E حداد ', phone: '+961 3 123 456', klass: 'Grade 3', address: 'Hamra St', enrollmentDate: '2026-09-21', level: '2',
  });
  assert.equal(ok.error, undefined);
  assert.equal(ok.value.name, 'ليلى حداد');
  assert.equal(ok.value.level, 2);

  const base = { name: 'A', phone: '+961 3 123 456', klass: 'B', address: '', enrollmentDate: '2026-09-21', level: 1 };
  for (const level of [99, 0, -1, '1; DROP TABLE students', 'abc', null, 2.5]) {
    assert.ok(validateStudent({ ...base, level }).error, `level accepted: ${level}`);
  }
  assert.ok(validateStudent({ ...base, address: 'x'.repeat(LIMITS.address + 1) }).error);
  assert.ok(validateStudent({ ...base, klass: '' }).error);
});

test('whole payment form: bad amounts, dates, month and oversize notes fail', () => {
  const base = { datePaid: '2026-09-21', amount: '50', monthCovered: 'September 2026', notes: 'ok' };
  assert.equal(validatePayment(base).error, undefined);
  assert.ok(validatePayment({ ...base, amount: '-1' }).error);
  assert.ok(validatePayment({ ...base, datePaid: '2026-99-99' }).error);
  assert.ok(validatePayment({ ...base, monthCovered: '' }).error);
  assert.ok(validatePayment({ ...base, notes: 'n'.repeat(LIMITS.notes + 1) }).error);
});

test('expenses: valid entries pass, bad category/amount/date/length fail', () => {
  const base = { category: 'salary', payee: 'Sarah Alwan', amount: '300', datePaid: '2026-09-21', notes: 'September' };
  const ok = validateExpense(base);
  assert.equal(ok.error, undefined);
  assert.equal(ok.value.category, 'salary');
  assert.equal(ok.value.amount, 300);

  for (const category of ['payroll', 'SALARY', '', null, "salary'; DROP TABLE expenses;--", 0, 1]) {
    assert.ok(validateExpense({ ...base, category }).error, `category accepted: ${category}`);
  }
  for (const category of ['rent', 'utilities', 'supplies', 'maintenance', 'other']) {
    assert.equal(validateExpense({ ...base, category }).error, undefined, `category rejected: ${category}`);
  }
  // amount is required for an expense (unlike an optional payment amount)
  assert.ok(validateExpense({ ...base, amount: '' }).error);
  assert.ok(validateExpense({ ...base, amount: '-5' }).error);
  assert.ok(validateExpense({ ...base, datePaid: '2026-13-40' }).error);
  assert.ok(validateExpense({ ...base, payee: 'x'.repeat(LIMITS.payee + 1) }).error);
  assert.ok(validateExpense({ ...base, notes: 'n'.repeat(LIMITS.notes + 1) }).error);

  // an empty payee/notes is fine - only the category, amount and date are required
  assert.equal(validateExpense({ ...base, payee: '', notes: '' }).error, undefined);
});

test('academy profile: limits and phone format enforced', () => {
  const base = { name: 'Mahara', ownerName: 'Sarah', phone: '+961 3 123 456', address: 'Beirut' };
  assert.equal(validateProfile(base).error, undefined);
  assert.ok(validateProfile({ ...base, name: 'x'.repeat(LIMITS.academyName + 1) }).error);
  assert.ok(validateProfile({ ...base, phone: '<script>' }).error);
});
