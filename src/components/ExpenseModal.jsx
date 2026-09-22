import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { isoOf, todayLocalMidnight } from '../lib/dateUtils';
import { validateExpense, errText, LIMITS } from '../lib/validate';
import { EXPENSE_CATEGORIES } from '../lib/expenseCategories';
import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';

export default function ExpenseModal({ expense, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!expense;
  const [category, setCategory] = useState(expense?.category || 'salary');
  const [payee, setPayee] = useState(expense?.payee || '');
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : '');
  const [datePaid, setDatePaid] = useState(expense?.date_paid || isoOf(todayLocalMidnight()));
  const [notes, setNotes] = useState(expense?.notes || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSalary = category === 'salary';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const checked = validateExpense({ category, payee, amount, datePaid, notes });
    if (checked.error) {
      setError(errText(t, checked.error));
      return;
    }
    setSaving(true);

    const { error } = isEdit
      ? await supabase.from('expenses').update(checked.value).eq('id', expense.id)
      : await supabase.from('expenses').insert(checked.value);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal student-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('close')}>
          <Icon name="close" size={18} />
        </button>

        <div className="modal-head">
          <div className="modal-head-icon"><Icon name="wallet" size={22} /></div>
          <div>
            <h2>{isEdit ? t('edit_expense') : t('add_expense')}</h2>
            <div className="sub">{isEdit ? t('expense_edit_sub') : t('expense_form_sub')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label id="e_category_label">{t('category_label')}</label>
            <div className="level-picker category-picker" role="radiogroup" aria-labelledby="e_category_label">
              {EXPENSE_CATEGORIES.map(({ id, icon }) => (
                <label key={id} className={`level-option cat-${id} ${category === id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="e_category"
                    value={id}
                    checked={category === id}
                    onChange={() => setCategory(id)}
                  />
                  <span className="level-chip"><Icon name={icon} size={15} /></span>
                  <span className="level-option-name">{t(`cat_${id}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="e_payee">{isSalary ? t('payee_salary_label') : t('payee_other_label')}</label>
              <input
                id="e_payee"
                maxLength={LIMITS.payee}
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder={isSalary ? t('payee_salary_ph') : t('payee_other_ph')}
              />
            </div>
            <div className="field">
              <label htmlFor="e_amount">{t('expense_amount')}</label>
              <input
                id="e_amount"
                type="number"
                inputMode="decimal"
                min="0"
                max="10000000"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('expense_amount_ph')}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="e_date">{t('expense_date')}</label>
            <input id="e_date" type="date" required min="2000-01-01" value={datePaid} onChange={(e) => setDatePaid(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="e_notes">{t('notes_optional')}</label>
            <textarea id="e_notes" rows={2} maxLength={LIMITS.notes} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notes_ph')} />
          </div>

          {error && <div className="field-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn-cta" disabled={saving}>{saving ? t('saving') : t('save_expense')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
