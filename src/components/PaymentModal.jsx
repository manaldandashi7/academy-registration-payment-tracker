import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { isoOf, todayLocalMidnight, computeStatus, fmtMonthYear } from '../lib/dateUtils';
import { useLanguage } from '../i18n.jsx';
import { validatePayment, errText, LIMITS } from '../lib/validate';
import Icon from './Icons.jsx';

// Records a new payment for `student`, or - when `payment` is passed - views
// and edits an existing one (opened from the Payments page).
export default function PaymentModal({ student, payment, payments, onClose, onSaved }) {
  const { t, locale } = useLanguage();
  const isEdit = !!payment;

  const initialMonth = isEdit
    ? payment.month_covered || ''
    : (student ? fmtMonthYear(computeStatus(student, payments).dueDate, locale) : '');
  // New payment: pre-filled from the student's monthly fee, if set, so staff
  // don't have to remember or retype it every month - still editable.
  const initialAmount = isEdit
    ? (payment.amount != null ? String(payment.amount) : '')
    : (student?.monthly_fee != null ? String(student.monthly_fee) : '');
  const initialDate = isEdit ? payment.date_paid : isoOf(todayLocalMidnight());
  const initialNotes = isEdit ? payment.notes || '' : '';

  const [datePaid, setDatePaid] = useState(initialDate);
  const [amount, setAmount] = useState(initialAmount);
  const [monthCovered, setMonthCovered] = useState(initialMonth);
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Same protection as the student/expense forms: an existing payment opens
  // read-only until the pencil is pressed, so a stray tap can't change it.
  const [locked, setLocked] = useState(isEdit);

  const isDirty = !isEdit || (
    datePaid !== initialDate
    || amount !== initialAmount
    || monthCovered !== initialMonth
    || notes !== initialNotes
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked) return;
    setError('');
    const checked = validatePayment({ datePaid, amount, monthCovered, notes });
    if (checked.error) {
      setError(errText(t, checked.error));
      return;
    }
    setSaving(true);
    const { error } = isEdit
      ? await supabase.from('payments').update(checked.value).eq('id', payment.id)
      : await supabase.from('payments').insert({ student_id: student.id, level: student.level, ...checked.value });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (onSaved) {
      // Next due date as it will be once this payment is counted.
      const after = student
        ? computeStatus(student, [...payments, { student_id: student.id, date_paid: checked.value.date_paid }]).dueDate
        : null;
      onSaved({ isEdit, amount: checked.value.amount, studentName: student?.name || '', nextDue: after });
    }
    onClose();
  }

  const title = isEdit ? t('edit_payment') : t('record_payment');
  const sub = student ? t('for_student', { name: student.name, klass: student.class }) : '';

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal student-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('close')}>
          <Icon name="close" size={18} />
        </button>

        <div className="modal-head">
          <div className="modal-head-icon"><Icon name="receipt" size={22} /></div>
          <div>
            <h2>{title}</h2>
            <div className="sub">{isEdit && locked ? t('viewing_payment_sub') : sub}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="p_date">{t('date_paid')}</label>
              <input id="p_date" type="date" required disabled={locked} value={datePaid} onChange={(e) => setDatePaid(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p_amount">{t('amount_optional')}</label>
              <input id="p_amount" type="number" inputMode="decimal" min="0" max="10000000" step="0.01" disabled={locked} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('amount_ph')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="p_month">{t('month_covered')}</label>
            <input id="p_month" required maxLength={LIMITS.month} readOnly={locked} value={monthCovered} onChange={(e) => setMonthCovered(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p_notes">{t('notes_optional')}</label>
            <textarea id="p_notes" rows={2} maxLength={LIMITS.notes} readOnly={locked} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notes_ph')} />
          </div>

          {error && <div className="field-error">{error}</div>}
          {!locked && !isDirty && <div className="field-hint">{t('no_changes_hint')}</div>}
          <div className="modal-actions">
            {locked ? (
              <>
                <button type="button" className="btn ghost" onClick={onClose}>{t('close')}</button>
                <button type="button" className="btn-cta" onClick={() => setLocked(false)}>
                  <Icon name="edit" size={15} />
                  {t('edit')}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn ghost" onClick={onClose}>{t('cancel')}</button>
                <button type="submit" className="btn-cta" disabled={saving || !isDirty}>
                  {saving ? t('saving') : isEdit ? t('save_changes') : t('save_payment')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
