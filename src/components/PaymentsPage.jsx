import { useMemo, useState } from 'react';
import { fmtDate, parseISODateLocal, monthKeyOf, monthLabel, currentMonthKey } from '../lib/dateUtils';
import Icon, { Friend } from './Icons.jsx';
import RowMenu from './RowMenu.jsx';
import SearchBox, { matchesSearch } from './SearchBox.jsx';
import { useLanguage } from '../i18n.jsx';

// Every recorded payment, grouped by the month it was actually paid in
// (date_paid - same basis as the Income report, i.e. real cash received).
// The current month is always shown open at the top; earlier months sit
// collapsed underneath and open on click.
export default function PaymentsPage({ payments, students, onEditPayment, onDeletePayment }) {
  const { t, locale } = useLanguage();
  const thisMonth = currentMonthKey();
  const [openMonths, setOpenMonths] = useState(() => new Set([thisMonth]));
  const [query, setQuery] = useState('');

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const groups = useMemo(() => {
    const byMonth = new Map();
    for (const p of payments) {
      const s = studentById.get(p.student_id);
      if (query && !matchesSearch(query, [s?.name, s?.phone, s?.class, p.month_covered, p.notes])) continue;
      const key = monthKeyOf(p.date_paid);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(p);
    }
    // The current month always has a section, even before its first payment.
    if (!query && !byMonth.has(thisMonth)) byMonth.set(thisMonth, []);
    return [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, rows]) => ({
        key,
        rows: rows.sort((a, b) => b.date_paid.localeCompare(a.date_paid) || String(b.created_at).localeCompare(String(a.created_at))),
        total: rows.reduce((sum, p) => sum + (p.amount != null ? Number(p.amount) : 0), 0),
      }));
  }, [payments, studentById, query, thisMonth]);

  // While searching, every month with a match is shown open, so results
  // aren't hidden behind collapsed buttons.
  const isOpen = (key) => !!query || openMonths.has(key);
  function toggle(key) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{t('nav_payments')}</h1>
          <div className="today">{t('payments_sub')}</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="empty-state">
          <Friend tone="green" />
          <div className="big">{t('no_payments')}</div>
          <p>{t('payments_empty_help')}</p>
        </div>
      ) : (
        <>
          <SearchBox value={query} onChange={setQuery} placeholder={t('search_payments_ph')} />

          {groups.length === 0 ? (
            <div className="empty-state compact">
              <div className="big">{t('no_search_results')}</div>
            </div>
          ) : (
            <div className="month-list">
              {groups.map(({ key, rows, total }) => {
                const open = isOpen(key);
                return (
                  <section key={key} className={`month-group ${open ? 'open' : ''} ${key === thisMonth ? 'current' : ''}`}>
                    <button type="button" className="month-head" onClick={() => toggle(key)} aria-expanded={open} disabled={!!query}>
                      <Icon name="chevronDown" size={16} className="month-caret" />
                      <span className="month-name">{monthLabel(key, locale)}</span>
                      {key === thisMonth && <span className="month-tag">{t('this_month')}</span>}
                      <span className="month-meta">
                        {t('payments_count', { n: rows.length })}
                        <strong>{total.toFixed(0)}</strong>
                      </span>
                    </button>

                    {open && (
                      rows.length === 0 ? (
                        <div className="month-empty">{t('no_payments_this_month')}</div>
                      ) : (
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>{t('col_name')}</th>
                                <th>{t('level_label')}</th>
                                <th>{t('date_paid')}</th>
                                <th>{t('month_covered')}</th>
                                <th>{t('col_amount')}</th>
                                <th>{t('col_notes')}</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((p) => {
                                const s = studentById.get(p.student_id);
                                return (
                                  <tr key={p.id}>
                                    <td data-label={t('col_name')}>
                                      <div className="student-name">{s?.name || '—'}</div>
                                      {s && !s.active && <div className="student-sub">{t('archived_tag')}</div>}
                                    </td>
                                    <td data-label={t('level_label')}>
                                      <span className={`level-chip lv-${p.level}`}>{p.level}</span>
                                    </td>
                                    <td data-label={t('date_paid')}>{fmtDate(parseISODateLocal(p.date_paid), locale)}</td>
                                    <td data-label={t('month_covered')}>{p.month_covered || '—'}</td>
                                    <td data-label={t('col_amount')}>
                                      {p.amount != null ? <strong>{Number(p.amount).toFixed(0)}</strong> : <span className="cell-unset">—</span>}
                                    </td>
                                    <td data-label={t('col_notes')} className="expense-notes">{p.notes || ''}</td>
                                    <td data-label="">
                                      <RowMenu
                                        items={[
                                          { label: t('view_edit'), icon: 'edit', onClick: () => onEditPayment(p) },
                                          { label: t('delete_payment'), icon: 'trash', danger: true, onClick: () => onDeletePayment(p) },
                                        ]}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
