import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { isoOf, todayLocalMidnight } from '../lib/dateUtils';

export default function StudentModal({ student, presetLevel, onClose }) {
  const isEdit = !!student;
  const [name, setName] = useState(student?.name || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [klass, setKlass] = useState(student?.class || '');
  const [level, setLevel] = useState(student?.level || presetLevel || 1);
  const [enrollmentDate, setEnrollmentDate] = useState(student?.enrollment_date || isoOf(todayLocalMidnight()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(student?.name || '');
    setPhone(student?.phone || '');
    setKlass(student?.class || '');
    setLevel(student?.level || presetLevel || 1);
    setEnrollmentDate(student?.enrollment_date || isoOf(todayLocalMidnight()));
  }, [student, presetLevel]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !phone.trim() || !klass.trim() || !enrollmentDate) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      class: klass.trim(),
      level: Number(level),
      enrollment_date: enrollmentDate,
      active: true,
    };

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

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{isEdit ? 'Edit student' : 'Add student'}</h2>
        <div className="sub">Payment tracking starts one month after enrollment.</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="s_name">Name</label>
            <input id="s_name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Layla Haddad" />
          </div>
          <div className="field">
            <label htmlFor="s_phone">Parent's WhatsApp number</label>
            <input id="s_phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +9613xxxxxx" />
          </div>
          <div className="field">
            <label htmlFor="s_class">Class</label>
            <input id="s_class" required value={klass} onChange={(e) => setKlass(e.target.value)} placeholder="e.g. English - Grade 3" />
          </div>
          <div className="field">
            <label htmlFor="s_level">Level</label>
            <select id="s_level" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
              <option value={4}>Level 4</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="s_enrolled">Enrollment date</label>
            <input id="s_enrolled" type="date" required value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
          </div>
          {error && <div className="field-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save student'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
