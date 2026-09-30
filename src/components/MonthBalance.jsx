import { useLanguage } from '../i18n.jsx';
import { monthLabel } from '../lib/dateUtils';

// One month's balance as a card: expected income - expenses = money left,
// with what's actually been collected underneath. `summary` comes from
// summarizeMonth() in lib/monthlySummary.js.
export default function MonthBalance({ summary }) {
  const { t, locale } = useLanguage();
  const s = summary;
  const collectedPct = s.expected > 0 ? Math.min(100, Math.round((s.collected / s.expected) * 100)) : 0;

  return (
    <section className="balance-card">
      <div className="balance-flow">
        <div className="balance-item">
          <div className="balance-label">{t('expected_income')}</div>
          <div className="balance-num">{s.expected.toFixed(0)}</div>
          <div className="balance-sub">{t('expected_income_sub', { n: s.studentCount })}</div>
        </div>
        <div className="balance-op" aria-hidden="true">−</div>
        <div className="balance-item">
          <div className="balance-label">{t('col_expenses')}</div>
          <div className="balance-num">{s.totalExpenses.toFixed(0)}</div>
          <div className="balance-sub">
            {t('expenses_breakdown', { salaries: s.salaries.toFixed(0), other: s.otherExpenses.toFixed(0) })}
          </div>
        </div>
        <div className="balance-op" aria-hidden="true">=</div>
        <div className={`balance-item result ${s.left < 0 ? 'negative' : 'positive'}`}>
          <div className="balance-label">{t('money_left')}</div>
          <div className="balance-num">{s.left.toFixed(0)}</div>
          <div className="balance-sub">{t('money_left_sub')} · {monthLabel(s.monthKey, locale)}</div>
        </div>
      </div>

      {s.expected > 0 && (
        <div className="balance-collect">
          <div className="balance-track"><div className="balance-fill" style={{ width: `${collectedPct}%` }} /></div>
          <div className="balance-collect-text">
            <span>{t('collected_so_far', { n: s.collected.toFixed(0) })}</span>
            <span>{s.stillToCollect > 0 ? t('still_to_collect', { n: s.stillToCollect.toFixed(0) }) : t('all_collected')}</span>
          </div>
        </div>
      )}

      {s.missingFee > 0 && <div className="balance-note">{t('missing_fee_note', { n: s.missingFee })}</div>}
    </section>
  );
}
