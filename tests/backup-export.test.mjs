// "Download backup": sheet layout, and a real .xlsx built from it.
// Run with:  node --test tests/backup-export.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import writeXlsxFile from 'write-excel-file/node';
import { unzipSync, strFromU8 } from 'fflate';
import { buildBackupSheets, backupFileName } from '../src/lib/exportData.js';
import { translate } from '../src/i18n-strings.js';

const data = {
  students: [
    { id: 's1', name: 'سارة', phone: '70111222', class: 'A', level: 2, address: 'بيروت', enrollment_date: '2026-07-01', monthly_fee: 50, active: true },
    { id: 's2', name: 'Ahmad', phone: '70333444', class: 'B', level: 1, address: null, enrollment_date: '2026-06-01', monthly_fee: null, active: false },
  ],
  payments: [
    { id: 'p1', student_id: 's2', level: 1, date_paid: '2026-07-02', amount: 40, month_covered: 'July', notes: null },
    { id: 'p2', student_id: 's1', level: 2, date_paid: '2026-09-01', amount: '50', month_covered: 'September', notes: 'cash' },
    { id: 'p3', student_id: 'gone', level: 3, date_paid: '2026-08-01', amount: 30, month_covered: 'August', notes: null },
  ],
  expenses: [{ id: 'e1', category: 'salary', payee: 'Teacher', amount: 300, date_paid: '2026-09-28', notes: null }],
  settings: { academy_name: 'أكاديمية المهرة', owner_name: 'Manal', phone: '+961', address: 'Beirut' },
};
const opts = (lang) => ({ t: (k, p) => translate(lang, k, p), rtl: lang === 'ar', exportedAt: '2026-10-01' });

test('four sheets: students (archived included), payments, expenses, academy info', () => {
  const [students, payments, expenses, info] = buildBackupSheets(data, opts('en'));
  assert.deepEqual([students.sheet, payments.sheet, expenses.sheet, info.sheet], ['Students', 'Payments', 'Expenses', 'Academy']);

  assert.equal(students.data.length, 3); // header + 2, archived kept
  assert.equal(students.data[1][0], 'سارة'); // active first
  assert.equal(students.data[2][7], 'Archived');
  assert.equal(students.data[2][6], null); // no fee -> empty cell, not 0

  assert.equal(payments.data.length, 4);
  assert.equal(payments.data[1][2], '2026-09-01'); // newest first
  assert.deepEqual(payments.data[1][3], { value: 50, type: Number }); // "50" stored as a number
  assert.equal(payments.data[2][0], '—'); // payment of a deleted student is still kept

  assert.equal(expenses.data[1][0], 'Salary');
  assert.ok(info.data.some((row) => row[1] === '2026-10-01'));
});

test('arabic export uses arabic labels and right-to-left sheets', () => {
  const sheets = buildBackupSheets(data, opts('ar'));
  assert.ok(sheets.every((s) => s.rightToLeft === true));
  assert.equal(sheets[0].sheet, translate('ar', 'students'));
  assert.equal(sheets[0].data[2][7], 'مؤرشف');
});

test('the sheets turn into a real Excel file containing the data', async () => {
  const buf = await writeXlsxFile(buildBackupSheets(data, opts('ar'))).toBuffer();
  const files = unzipSync(new Uint8Array(buf));
  const workbook = strFromU8(files['xl/workbook.xml']);
  assert.equal((workbook.match(/<sheet /g) || []).length, 4);
  const allXml = Object.entries(files).filter(([n]) => n.endsWith('.xml')).map(([, f]) => strFromU8(f)).join('');
  for (const text of ['سارة', 'Ahmad', 'أكاديمية المهرة', 'cash']) assert.ok(allXml.includes(text), text);
  assert.match(allXml, /rightToLeft="1"/);
});

test('file name is safe for any academy name', () => {
  assert.equal(backupFileName('أكاديمية المهرة', '2026-10-01'), 'أكاديمية المهرة - backup 2026-10-01.xlsx');
  assert.equal(backupFileName('A/B:C*?', '2026-10-01'), 'A B C - backup 2026-10-01.xlsx');
  assert.equal(backupFileName('', '2026-10-01'), 'Academy - backup 2026-10-01.xlsx');
});
