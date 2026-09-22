import { useLanguage } from '../i18n.jsx';
import { monthKeyOf, monthLabel, currentMonthKey, lastMonthKey, last6MonthKeys } from '../lib/dateUtils';
import { Friend } from './Icons.jsx';

export default function IncomeReport({ payments, expenses }) {
  const { t, locale } = useLanguage();
  const paid = payments.filter((p) => p.amount != null && !Number.isNaN(Number(p.amount)));

  // group income by month
  const byMonth = {};
  for (const p of paid) {
    const key = monthKeyOf(p.date_paid);
    if (!byMonth[key]) byMonth[key] = { total: 0, count: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    byMonth[key].total += Number(p.amount);
    byMonth[key].count += 1;
    const lvl = Number(p.level);
    if (byMonth[key].byLevel[lvl] != null) byMonth[key].byLevel[lvl] += Number(p.amount);
  }

  // group expenses by month, so each month row can show income, expenses and net
  const expenseByMonth = {};
  for (const e of expenses) {
    const key = monthKeyOf(e.date_paid);
    expenseByMonth[key] = (expenseByMonth[key] || 0) + Number(e.amount);
  }

  const months = Array.from(new Set([...Object.keys(byMonth), ...Object.keys(expenseByMonth)])).sort().reverse();
  const totalAllTime = paid.reduce((sum, p) => sum + Number(p.amount), 0);
  const expensesAllTime = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const currentKey = currentMonthKey();
  const lastKey = lastMonthKey();
  const thisMonthTotal = byMonth[currentKey]?.total || 0;
  const lastMonthTotal = byMonth[lastKey]?.total || 0;
  const thisMonthExpenses = expenseByMonth[currentKey] || 0;
  const lastMonthExpenses = expenseByMonth[lastKey] || 0;

  // last 6 months (including current) for the trend chart, oldest first
  const trendKeys = last6MonthKeys();
  const trendMax = Math.max(1, ...trendKeys.map((k) => byMonth[k]?.total || 0));

  return (
    <>
      <div className="page-header">
        <h1>{t('income_report')}</h1>
      </div>

      <div className="stats-row">
        <div className="stat-card income">
          <div className="num">{thisMonthTotal.toFixed(0)}</div>
          <div className="stat-text">
            <div className="label">{t('this_month')}</div>
            <div className={`stat-sub ${thisMonthTotal - thisMonthExpenses < 0 ? 'negative' : 'positive'}`}>
              {t('col_net')}: {(thisMonthTotal - thisMonthExpenses).toFixed(0)}
            </div>
          </div>
        </div>
        <div className="stat-card income">
          <div className="num">{lastMonthTotal.toFixed(0)}</div>
          <div className="stat-text">
            <div className="label">{t('last_month')}</div>
            <div className={`stat-sub ${lastMonthTotal - lastMonthExpenses < 0 ? 'negative' : 'positive'}`}>
              {t('col_net')}: {(lastMonthTotal - lastMonthExpenses).toFixed(0)}
            </div>
          </div>
        </div>
        <div className="stat-card income">
          <div className="num">{totalAllTime.toFixed(0)}</div>
          <div className="stat-text">
            <div className="label">{t('all_time_total')}</div>
            <div className={`stat-sub ${totalAllTime - expensesAllTime < 0 ? 'negative' : 'positive'}`}>
              {t('col_net')}: {(totalAllTime - expensesAllTime).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">{t('last_6_months')}</div>
      <div className="trend-card">
        {trendKeys.map((k) => {
          const total = byMonth[k]?.total || 0;
          const pct = Math.round((total / trendMax) * 100);
          return (
            <div className="bar-row" key={k}>
              <div className="bar-label">{monthLabel(k, locale)}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="bar-value">{total.toFixed(0)}</div>
            </div>
          );
        })}
      </div>

      <div className="section-title">{t('by_month')}</div>
      {months.length === 0 ? (
        <div className="empty-state">
          <Friend tone="green" />
          <div className="big">{t('no_payments')}</div>
          <p>{t('no_payments_help')}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="income-table">
            <thead>
              <tr>
                <th>{t('col_month')}</th>
                <th>{t('col_payments')}</th>
                <th className="amount">{t('level', { n: 1 })}</th>
                <th className="amount">{t('level', { n: 2 })}</th>
                <th className="amount">{t('level', { n: 3 })}</th>
                <th className="amount">{t('level', { n: 4 })}</th>
                <th className="amount">{t('col_total')}</th>
                <th className="amount">{t('col_expenses')}</th>
                <th className="amount">{t('col_net')}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((k) => {
                const income = byMonth[k] || { total: 0, count: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0 } };
                const spent = expenseByMonth[k] || 0;
                const net = income.total - spent;
                return (
                  <tr key={k}>
                    <td data-label={t('col_month')}>{monthLabel(k, locale)}</td>
                    <td data-label={t('col_payments')}>{income.count}</td>
                    <td data-label={t('level', { n: 1 })} className="amount">{income.byLevel[1].toFixed(0)}</td>
                    <td data-label={t('level', { n: 2 })} className="amount">{income.byLevel[2].toFixed(0)}</td>
                    <td data-label={t('level', { n: 3 })} className="amount">{income.byLevel[3].toFixed(0)}</td>
                    <td data-label={t('level', { n: 4 })} className="amount">{income.byLevel[4].toFixed(0)}</td>
                    <td data-label={t('col_total')} className="amount"><strong>{income.total.toFixed(0)}</strong></td>
                    <td data-label={t('col_expenses')} className="amount">{spent.toFixed(0)}</td>
                    <td data-label={t('col_net')} className={`amount ${net < 0 ? 'net-negative' : 'net-positive'}`}>{net.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
