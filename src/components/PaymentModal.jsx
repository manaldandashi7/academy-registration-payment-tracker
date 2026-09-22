import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { isoOf, todayLocalMidnight, computeStatus, fmtMonthYear } from '../lib/dateUtils';
import { useLanguage } from '../i18n.jsx';
import { validatePayment, errText, LIMITS } from '../lib/validate';

export default function PaymentModal({ student, payments, onClose }) {
  const { t, locale } = useLanguage();
  const suggestedMonth = fmtMonthYear(computeStatus(student, payments).dueDate, locale);
  const [datePaid, setDatePaid] = useState(isoOf(todayLocalMidnight()));
  const [amount, setAmount] = useState('');
  const [monthCovered, setMonthCovered] = useState(suggestedMonth);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const checked = validatePayment({ datePaid, amount, monthCovered, notes });
    if (checked.error) {
      setError(errText(t, checked.error));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('payments').insert({
      student_id: student.id,
      level: student.level,
      ...checked.value,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{t('record_payment')}</h2>
        <div className="sub">{t('for_student', { name: student.name, klass: student.class })}</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="p_date">{t('date_paid')}</label>
            <input id="p_date" type="date" required value={datePaid} onChange={(e) => setDatePaid(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p_amount">{t('amount_optional')}</label>
            <input id="p_amount" type="number" inputMode="decimal" min="0" max="10000000" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('amount_ph')} />
          </div>
          <div className="field">
            <label htmlFor="p_month">{t('month_covered')}</label>
            <input id="p_month" required maxLength={LIMITS.month} value={monthCovered} onChange={(e) => setMonthCovered(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p_notes">{t('notes_optional')}</label>
            <textarea id="p_notes" rows={2} maxLength={LIMITS.notes} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notes_ph')} />
          </div>
          {error && <div className="field-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? t('saving') : t('save_payment')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
