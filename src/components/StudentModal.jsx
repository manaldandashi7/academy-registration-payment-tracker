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
  const [enrollmentDate, setEnrollmentDate] = useState(student?.enrollment_date || isoOf(todayLocalMidnight()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(student?.name || '');
    setPhone(student?.phone || '');
    setKlass(student?.class || '');
    setAddress(student?.address || '');
    setLevel(student?.level || presetLevel || 1);
    setEnrollmentDate(student?.enrollment_date || isoOf(todayLocalMidnight()));
  }, [student, presetLevel]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const checked = validateStudent({ name, phone, klass, address, enrollmentDate, level });
    if (checked.error) {
      setError(errText(t, checked.error));
      return;
    }
    setSaving(true);

    const { address: cleanAddress, ...rest } = checked.value;
    const payload = { ...rest, active: true };
    // Only send the address when there is one to save (or one to clear), so the
    // form keeps working on databases that have not added the column yet.
    if (cleanAddress || student?.address) payload.address = cleanAddress;

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
            <div className="sub">{isEdit ? t('student_edit_sub') : t('student_form_sub')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="s_name">{t('student_name')}</label>
            <input id="s_name" required autoFocus maxLength={LIMITS.name} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('student_name_ph')} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="s_phone">{t('parent_whatsapp')}</label>
              <input id="s_phone" dir="ltr" className="phone-input" type="tel" inputMode="tel" maxLength={25} autoComplete="off" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9613xxxxxx" />
            </div>
            <div className="field">
              <label htmlFor="s_class">{t('class_label')}</label>
              <input id="s_class" required maxLength={LIMITS.klass} value={klass} onChange={(e) => setKlass(e.target.value)} placeholder={t('class_ph')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="s_address">{t('address_optional')}</label>
            <input id="s_address" maxLength={LIMITS.address} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('student_address_ph')} />
          </div>

          <div className="field">
            <label id="s_level_label">{t('level_label')}</label>
            <div className="level-picker" role="radiogroup" aria-labelledby="s_level_label">
              {[1, 2, 3, 4].map((l) => (
                <label key={l} className={`level-option lv-${l} ${Number(level) === l ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="s_level"
                    value={l}
                    checked={Number(level) === l}
                    onChange={() => setLevel(l)}
                  />
                  <span className="level-chip">{l}</span>
                  <span className="level-option-name">{t('level', { n: l })}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="s_enrolled">{t('enrollment_date')}</label>
            <input id="s_enrolled" type="date" required min="2000-01-01" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
            {firstDue && <div className="field-hint">{t('first_due', { date: firstDue })}</div>}
          </div>

          {error && <div className="field-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn-cta" disabled={saving}>{saving ? t('saving') : isEdit ? t('save_changes') : t('add_student')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
