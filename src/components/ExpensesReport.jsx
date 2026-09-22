import { useState } from 'react';
import { fmtDate, monthKeyOf, currentMonthKey, lastMonthKey, last6MonthKeys, monthLabel, parseISODateLocal } from '../lib/dateUtils';
import { EXPENSE_CATEGORIES } from '../lib/expenseCategories';
import Icon, { Friend } from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';

export default function ExpensesReport({ expenses, onAddExpense, onEditExpense, onDeleteExpense }) {
  const { t, locale } = useLanguage();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const byMonth = {};
  for (const e of expenses) {
    const key = monthKeyOf(e.date_paid);
    byMonth[key] = (byMonth[key] || 0) + Number(e.amount);
  }

  const currentKey = currentMonthKey();
  const lastKey = lastMonthKey();
  const thisMonthTotal = byMonth[currentKey] || 0;
  const lastMonthTotal = byMonth[lastKey] || 0;
  const allTimeTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const trendKeys = last6MonthKeys();
  const trendMax = Math.max(1, ...trendKeys.map((k) => byMonth[k] || 0));

  const rows = [...expenses].sort((a, b) => b.date_paid.localeCompare(a.date_paid));
  const categoryLabel = (id) => t(`cat_${id}`) || id;

  // Filters only narrow the list below - the stats and trend chart above
  // always reflect everything, so they stay meaningful totals at a glance.
  const availableMonths = Array.from(new Set(rows.map((e) => monthKeyOf(e.date_paid)))).sort().reverse();
  const filteredRows = rows.filter((e) =>
    (categoryFilter === 'all' || e.category === categoryFilter) &&
    (monthFilter === 'all' || monthKeyOf(e.date_paid) === monthFilter)
  );

  return (
    <>
      <div className="page-header">
        <h1>{t('expenses_title')}</h1>
        <button className="btn-cta" onClick={onAddExpense}>
          <Icon name="wallet" size={17} />
          {t('add_expense')}
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card expense"><div className="num">{thisMonthTotal.toFixed(0)}</div><div className="label">{t('this_month_expenses')}</div></div>
        <div className="stat-card expense"><div className="num">{lastMonthTotal.toFixed(0)}</div><div className="label">{t('last_month_expenses')}</div></div>
        <div className="stat-card expense"><div className="num">{allTimeTotal.toFixed(0)}</div><div className="label">{t('all_time_expenses')}</div></div>
      </div>

      {expenses.length > 0 && (
        <>
          <div className="section-title">{t('last_6_months')}</div>
          <div className="trend-card">
            {trendKeys.map((k) => {
              const total = byMonth[k] || 0;
              const pct = Math.round((total / trendMax) * 100);
              return (
                <div className="bar-row" key={k}>
                  <div className="bar-label">{monthLabel(k, locale)}</div>
                  <div className="bar-track"><div className="bar-fill expense-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="bar-value">{total.toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="section-title">{t('expenses_title')}</div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <Friend tone="yellow" />
          <div className="big">{t('no_expenses_yet')}</div>
          <p>{t('no_expenses_help')}</p>
          <button className="btn-cta" onClick={onAddExpense}>
            <Icon name="wallet" size={17} />
            {t('add_first_expense')}
          </button>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <div className="select-wrap">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label={t('col_category')}>
                <option value="all">{t('all_categories')}</option>
                {EXPENSE_CATEGORIES.map(({ id }) => (
                  <option key={id} value={id}>{categoryLabel(id)}</option>
                ))}
              </select>
              <Icon name="chevronDown" size={14} className="select-caret" />
            </div>
            <div className="select-wrap">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} aria-label={t('expense_date')}>
                <option value="all">{t('all_months')}</option>
                {availableMonths.map((k) => (
                  <option key={k} value={k}>{monthLabel(k, locale)}</option>
                ))}
              </select>
              <Icon name="chevronDown" size={14} className="select-caret" />
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="empty-state">
              <div className="big">{t('no_expenses_match')}</div>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('col_category')}</th>
                    <th>{t('col_payee')}</th>
                    <th>{t('expense_date')}</th>
                    <th className="amount">{t('col_amount')}</th>
                    <th>{t('col_notes')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((e) => (
                    <tr key={e.id}>
                      <td data-label={t('col_category')}>
                        <span className={`badge cat-${e.category}`}>
                          <Icon name={EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.icon || 'dots'} size={12} />
                          {categoryLabel(e.category)}
                        </span>
                      </td>
                      <td data-label={t('col_payee')}>{e.payee || '—'}</td>
                      <td data-label={t('expense_date')}>{fmtDate(parseISODateLocal(e.date_paid), locale)}</td>
                      <td data-label={t('col_amount')} className="amount">{Number(e.amount).toFixed(0)}</td>
                      <td data-label={t('col_notes')} className="expense-notes">{e.notes || ''}</td>
                      <td data-label="">
                        <div className="row-actions">
                          <button className="btn subtle" onClick={() => onEditExpense(e)}>{t('edit')}</button>
                          <button className="btn subtle" onClick={() => onDeleteExpense(e)}>{t('delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
