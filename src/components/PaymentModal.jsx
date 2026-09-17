import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { isoOf, todayLocalMidnight, computeStatus, fmtMonthYear } from '../lib/dateUtils';

export default function PaymentModal({ student, payments, onClose }) {
  const suggestedMonth = fmtMonthYear(computeStatus(student, payments).dueDate);
  const [datePaid, setDatePaid] = useState(isoOf(todayLocalMidnight()));
  const [amount, setAmount] = useState('');
  const [monthCovered, setMonthCovered] = useState(suggestedMonth);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const { error } = await supabase.from('payments').insert({
      student_id: student.id,
      level: student.level,
      date_paid: datePaid,
      amount: amount ? Number(amount) : null,
      month_covered: monthCovered.trim(),
      notes: notes.trim(),
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
        <h2>Record payment</h2>
        <div className="sub">For {student.name} ({student.class})</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="p_date">Date paid</label>
            <input id="p_date" type="date" required value={datePaid} onChange={(e) => setDatePaid(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p_amount">Amount (optional)</label>
            <input id="p_amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div className="field">
            <label htmlFor="p_month">Month covered</label>
            <input id="p_month" required value={monthCovered} onChange={(e) => setMonthCovered(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p_notes">Notes (optional)</label>
            <textarea id="p_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth noting" />
          </div>
          {error && <div className="field-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
