import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';
import { isoDate, errText } from '../lib/validate';
import { fmtDate, parseISODateLocal, lastPaymentFor, monthLabel } from '../lib/dateUtils';
import { defaultStopDate, lastCountedMonth } from '../lib/monthlySummary';

// Archiving asks one thing: from which date is this student's fee no longer
// expected? It's pre-filled with their first unpaid renewal (e.g. paid
// 22 Oct -> 22 Nov, leaves: 22 Nov), which is right almost every time, and
// can be changed. The Monthly balance then counts them only before that date,
// so the months they were really here keep their numbers.
export default function ArchiveModal({ student, payments, onClose, onArchived }) {
  const { t, locale } = useLanguage();
  const [stopDate, setStopDate] = useState(() => defaultStopDate(student, payments));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const lastPaid = lastPaymentFor(payments, student.id);
  const fmt = (iso) => fmtDate(parseISODateLocal(iso), locale);
  const validStop = /^\d{4}-\d{2}-\d{2}$/.test(stopDate) && stopDate >= student.enrollment_date;
  const lastMonth = validStop ? lastCountedMonth(student, payments, stopDate) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const checked = isoDate(stopDate, { fieldKey: 'stop_date_label' });
    if (checked.error) { setError(errText(t, checked.error)); return; }
    if (checked.value < student.enrollment_date) { setError(t('stop_before_enrollment')); return; }

    setSaving(true);
    let { error: updateError } = await supabase
      .from('students')
      .update({ active: false, stopped_from: checked.value })
      .eq('id', student.id);
    // supabase/student_stopped_from.sql not run yet: still archive, without the date.
    let dateSkipped = false;
    if (updateError && /stopped_from/i.test(updateError.message)) {
      ({ error: updateError } = await supabase.from('students').update({ active: false }).eq('id', student.id));
      dateSkipped = !updateError;
    }
    setSaving(false);
    if (updateError) { setError(t('archive_failed', { msg: updateError.message })); return; }
    onArchived({ dateSkipped });
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal student-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('close')}>
          <Icon name="close" size={18} />
        </button>

        <div className="modal-head">
          <div className="modal-head-icon"><Icon name="box" size={22} /></div>
          <div>
            <h2>{t('archive_title', { name: student.name })}</h2>
            <div className="sub">{t('archive_sub')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="archive-facts">
            <div>
              <span>{t('enrollment_date')}</span>
              <strong>{fmt(student.enrollment_date)}</strong>
            </div>
            <div>
              <span>{t('last_payment')}</span>
              <strong>{lastPaid ? fmt(lastPaid) : t('no_payments_yet')}</strong>
            </div>
            {lastPaid && (
              <div>
                <span>{t('paid_until')}</span>
                <strong>{fmt(defaultStopDate(student, payments))}</strong>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="a_stop">{t('stop_date_label')}</label>
            <input
              id="a_stop"
              type="date"
              required
              min={student.enrollment_date}
              value={stopDate}
              onChange={(e) => setStopDate(e.target.value)}
            />
            <div className="field-hint">{t('stop_date_help')}</div>
          </div>

          {validStop && (
            <div className="archive-outcome">
              <Icon name="scale" size={16} />
              <span>
                {lastMonth
                  ? t('stop_outcome', { date: fmt(stopDate), month: monthLabel(lastMonth, locale) })
                  : t('stop_outcome_none', { date: fmt(stopDate) })}
              </span>
            </div>
          )}

          {error && <div className="field-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn-cta" disabled={saving || !validStop}>
              {saving ? t('saving') : t('archive')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
