import { useState } from 'react';
import { useLanguage } from '../i18n.jsx';
import { monthLabel, currentMonthKey } from '../lib/dateUtils';
import { summarizeMonth, balanceMonthKeys } from '../lib/monthlySummary';
import MonthBalance from './MonthBalance.jsx';

// The academy's monthly balance: expected income (active students' fees)
// minus that month's expenses. The card shows one month (this month to
// start with); clicking a row in the table below shows that month instead.
export default function BalancePage({ students, payments, expenses }) {
  const { t, locale } = useLanguage();
  const [selectedKey, setSelectedKey] = useState(currentMonthKey);
  const rows = balanceMonthKeys({ students, expenses }).map((k) => summarizeMonth(k, { students, payments, expenses }));
  const selected = rows.find((r) => r.monthKey === selectedKey) || rows[0];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{t('monthly_balance')}</h1>
          <div className="today">{t('monthly_balance_help')}</div>
        </div>
      </div>

      <div className="section-title">
        {selected.monthKey === currentMonthKey() ? t('month_balance') : monthLabel(selected.monthKey, locale)}
      </div>
      <MonthBalance summary={selected} />

      <div className="section-title">{t('by_month')}</div>
      <div className="table-scroll">
        <table className="income-table balance-table">
          <thead>
            <tr>
              <th>{t('col_month')}</th>
              <th>{t('col_students')}</th>
              <th className="amount">{t('col_expected')}</th>
              <th className="amount">{t('col_salaries')}</th>
              <th className="amount">{t('col_other_expenses')}</th>
              <th className="amount">{t('col_money_left')}</th>
              <th className="amount">{t('col_collected')}</th>
              <th className="amount">{t('col_still_to_collect')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.monthKey}
                className={`clickable ${b.monthKey === selected.monthKey ? 'selected' : ''}`}
                onClick={() => setSelectedKey(b.monthKey)}
              >
                <td data-label={t('col_month')}>{monthLabel(b.monthKey, locale)}</td>
                <td data-label={t('col_students')}>{b.studentCount}</td>
                <td data-label={t('col_expected')} className="amount">{b.expected.toFixed(0)}</td>
                <td data-label={t('col_salaries')} className="amount">{b.salaries.toFixed(0)}</td>
                <td data-label={t('col_other_expenses')} className="amount">{b.otherExpenses.toFixed(0)}</td>
                <td data-label={t('col_money_left')} className={`amount ${b.left < 0 ? 'net-negative' : 'net-positive'}`}><strong>{b.left.toFixed(0)}</strong></td>
                <td data-label={t('col_collected')} className="amount">{b.collected.toFixed(0)}</td>
                <td data-label={t('col_still_to_collect')} className="amount">{b.stillToCollect.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
