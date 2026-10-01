// ---- "Download backup": every student, payment and expense as one Excel file ----
//
// buildBackupSheets() only shapes the data (pure, tested in
// tests/backup-export.test.mjs); downloadBackup() loads the Excel writer on
// demand - so it isn't part of the app's normal download - and saves the file.

const bold = (value) => ({ value, fontWeight: 'bold' });
const num = (v) => {
  const n = Number(v);
  return v == null || v === '' || Number.isNaN(n) ? null : { value: n, type: Number };
};
const str = (v) => (v == null || v === '' ? null : String(v));
const byDateDesc = (a, b) => String(b.date_paid || '').localeCompare(String(a.date_paid || ''));

// Excel sheet names: max 31 chars, none of : \ / ? * [ ]
const sheetName = (s) => String(s).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);

export function buildBackupSheets({ students, payments, expenses, settings }, { t, rtl, exportedAt }) {
  const studentById = new Map(students.map((s) => [s.id, s]));
  const common = { rightToLeft: rtl, stickyRowsCount: 1 };

  const studentRows = [...students]
    .sort((a, b) => Number(b.active) - Number(a.active) || String(a.name).localeCompare(String(b.name)))
    .map((s) => [
      str(s.name), str(s.phone), str(s.class), num(s.level), str(s.address),
      str(s.enrollment_date), num(s.monthly_fee),
      s.active ? t('status_active') : t('status_archived'),
    ]);

  const paymentRows = [...payments].sort(byDateDesc).map((p) => [
    str(studentById.get(p.student_id)?.name) || '—', num(p.level), str(p.date_paid),
    num(p.amount), str(p.month_covered), str(p.notes),
  ]);

  const expenseRows = [...expenses].sort(byDateDesc).map((e) => [
    t(`cat_${e.category}`) || str(e.category), str(e.payee), num(e.amount),
    str(e.date_paid), str(e.notes),
  ]);

  const info = [
    [bold(t('academy_name')), str(settings?.academy_name)],
    [bold(t('contact_person')), str(settings?.owner_name)],
    [bold(t('phone')), str(settings?.phone)],
    [bold(t('address')), str(settings?.address)],
    [bold(t('backup_exported_at')), exportedAt],
    [bold(t('students')), students.length],
    [bold(t('nav_payments')), payments.length],
    [bold(t('nav_expenses')), expenses.length],
  ];

  return [
    {
      ...common, sheet: sheetName(t('students')),
      columns: [{ width: 26 }, { width: 16 }, { width: 12 }, { width: 8 }, { width: 26 }, { width: 14 }, { width: 13 }, { width: 12 }],
      data: [[
        t('col_name'), t('col_phone'), t('col_class'), t('level_label'), t('address'),
        t('enrollment_date'), t('col_monthly_fee'), t('col_status'),
      ].map(bold), ...studentRows],
    },
    {
      ...common, sheet: sheetName(t('nav_payments')),
      columns: [{ width: 26 }, { width: 8 }, { width: 14 }, { width: 11 }, { width: 18 }, { width: 30 }],
      data: [[
        t('col_name'), t('level_label'), t('date_paid'), t('col_amount'), t('month_covered'), t('col_notes'),
      ].map(bold), ...paymentRows],
    },
    {
      ...common, sheet: sheetName(t('nav_expenses')),
      columns: [{ width: 16 }, { width: 24 }, { width: 11 }, { width: 14 }, { width: 30 }],
      data: [[
        t('col_category'), t('col_payee'), t('col_amount'), t('date_paid'), t('col_notes'),
      ].map(bold), ...expenseRows],
    },
    { rightToLeft: rtl, sheet: sheetName(t('backup_sheet_info')), columns: [{ width: 22 }, { width: 34 }], data: info },
  ];
}

export function backupFileName(academyName, isoDate) {
  const safe = String(academyName || 'Academy').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'Academy';
  return `${safe} - backup ${isoDate}.xlsx`;
}

export async function downloadBackup(data, { t, rtl, isoDate }) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const sheets = buildBackupSheets(data, { t, rtl, exportedAt: isoDate });
  await writeXlsxFile(sheets, { fontFamily: 'Calibri', fontSize: 11 }).toFile(backupFileName(data.settings?.academy_name, isoDate));
}
