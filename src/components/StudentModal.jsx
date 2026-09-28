import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { isoOf, todayLocalMidnight, addMonthsClamped, fmtDate } from '../lib/dateUtils';
import Icon from './Icons.jsx';
import { validateStudent, errText, LIMITS } from '../lib/validate';
import { useLanguage } from '../i18n.jsx';

export default function StudentModal({ student, presetLevel, onClose }) {
  const { t, locale } = useLanguage();
  const isEdit = !!student;
  const [name, setName] = useState(student?.name || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [klass, setKlass] = useState(student?.class || '');
  const [address, setAddress] = useState(student?.address || '');
  const [level, setLevel] = useState(student?.level || presetLevel || 1);
  const [monthlyFee, setMonthlyFee] = useState(student?.monthly_fee != null ? String(student.monthly_fee) : '');
  const [enrollmentDate, setEnrollmentDate] = useState(student?.enrollment_date || isoOf(todayLocalMidnight()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Editing an existing student opens read-only, so a stray click/tap can't
  // change their info by accident - pressing the pencil unlocks the form.
  // Adding a brand-new student has nothing to protect, so it opens unlocked.
  const [locked, setLocked] = useState(isEdit);

  useEffect(() => {
    setName(student?.name || '');
    setPhone(student?.phone || '');
    setKlass(student?.class || '');
    setAddress(student?.address || '');
    setLevel(student?.level || presetLevel || 1);
    setMonthlyFee(student?.monthly_fee != null ? String(student.monthly_fee) : '');
    setEnrollmentDate(student?.enrollment_date || isoOf(todayLocalMidnight()));
    setLocked(!!student);
  }, [student, presetLevel]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked) return; // safety net: fields are read-only/disabled while locked anyway
    setError('');
    const checked = validateStudent({ name, phone, klass, address, enrollmentDate, level, monthlyFee });
    if (checked.error) {
      setError(errText(t, checked.error));
      return;
    }
    setSaving(true);

    const { address: cleanAddress, monthly_fee: cleanMonthlyFee, ...rest } = checked.value;
    const payload = { ...rest, active: true };
    // Only send address/monthly_fee when there's a value to save (or clear), so
    // the form keeps working on databases that haven't added those columns yet.
    if (cleanAddress || student?.address) payload.address = cleanAddress;
    if (cleanMonthlyFee != null || student?.monthly_fee != null) payload.monthly_fee = cleanMonthlyFee;

    const { error } = isEdit
      ? await supabase.from('students').update(payload).eq('id', student.id)
      : await supabase.from('students').insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  const firstDue = enrollmentDate ? fmtDate(addMonthsClamped(enrollmentDate, 1), locale) : null;

  // Guards against exactly the scenario that motivated the lock in the first
  // place: pressing Edit swaps that button into Save (same spot), and a second
  // press there - out of habit, before typing anything - would otherwise save
  // nothing and close the modal. Disabled until something's actually changed.
  const isDirty = !isEdit || (
    name !== (student?.name || '')
    || phone !== (student?.phone || '')
    || klass !== (student?.class || '')
    || address !== (student?.address || '')
    || Number(level) !== Number(student?.level || presetLevel || 1)
    || monthlyFee !== (student?.monthly_fee != null ? String(student.monthly_fee) : '')
    || enrollmentDate !== (student?.enrollment_date || isoOf(todayLocalMidnight()))
  );

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal student-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('close')}>
          <Icon name="close" size={18} />
        </button>

        <div className="modal-head">
          <div className="modal-head-icon"><Icon name="userPlus" size={22} /></div>
          <div>
            <h2>{isEdit ? t('edit_student') : t('add_new_student')}</h2>
            <div className="sub">{isEdit ? (locked ? t('viewing_student_sub') : t('student_edit_sub')) : t('student_form_sub')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="s_name">{t('student_name')}</label>
            <input id="s_name" required autoFocus={!locked} readOnly={locked} maxLength={LIMITS.name} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('student_name_ph')} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="s_phone">{t('parent_whatsapp')}</label>
              <input id="s_phone" dir="ltr" className="phone-input" type="tel" inputMode="tel" maxLength={25} autoComplete="off" required readOnly={locked} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9613xxxxxx" />
            </div>
            <div className="field">
              <label htmlFor="s_class">{t('class_label')}</label>
              <input id="s_class" required maxLength={LIMITS.klass} readOnly={locked} value={klass} onChange={(e) => setKlass(e.target.value)} placeholder={t('class_ph')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="s_address">{t('address_optional')}</label>
            <input id="s_address" maxLength={LIMITS.address} readOnly={locked} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('student_address_ph')} />
          </div>

          <div className="field">
            <label id="s_level_label">{t('level_label')}</label>
            <div className={`level-picker ${locked ? 'locked' : ''}`} role="radiogroup" aria-labelledby="s_level_label">
              {[1, 2, 3, 4].map((l) => (
                <label key={l} className={`level-option lv-${l} ${Number(level) === l ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="s_level"
                    value={l}
                    checked={Number(level) === l}
                    disabled={locked}
                    onChange={() => setLevel(l)}
                  />
                  <span className="level-chip">{l}</span>
                  <span className="level-option-name">{t('level', { n: l })}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="s_monthly_fee">{t('monthly_fee')}</label>
            <input
              id="s_monthly_fee"
              type="number"
              inputMode="decimal"
              min="0"
              max="10000000"
              step="0.01"
              disabled={locked}
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              placeholder={t('monthly_fee_ph')}
            />
          </div>

          <div className="field">
            <label htmlFor="s_enrolled">{t('enrollment_date')}</label>
            <input id="s_enrolled" type="date" required min="2000-01-01" disabled={locked} value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
            {firstDue && <div className="field-hint">{t('first_due', { date: firstDue })}</div>}
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
                <button type="submit" className="btn-cta" disabled={saving || !isDirty}>{saving ? t('saving') : isEdit ? t('save_changes') : t('add_student')}</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
