import { computeStatus, fmtDate, parseISODateLocal } from '../lib/dateUtils';
import { buildReminderMessage, openWhatsApp } from '../lib/whatsapp';

export default function LevelPage({ level, students, payments, academyName, onAddStudent, onEditStudent, onArchiveStudent, onRecordPayment }) {
  const rows = students
    .filter((s) => Number(s.level) === level)
    .map((s) => ({ s, info: computeStatus(s, payments) }))
    .sort((a, b) => a.s.name.localeCompare(b.s.name));

  return (
    <>
      <div className="page-header">
        <h1>Level {level}</h1>
        <button className="btn primary" onClick={() => onAddStudent(level)}>+ Add student</button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="big">No students in Level {level} yet</div>
          Click "+ Add student" to register one.
        </div>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Class</th><th>Enrolled</th><th>Due date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(({ s, info }) => (
              <tr key={s.id}>
                <td data-label="Name"><div className="student-name">{s.name}</div></td>
                <td data-label="Phone">{s.phone}</td>
                <td data-label="Class">{s.class}</td>
                <td data-label="Enrolled">{fmtDate(parseISODateLocal(s.enrollment_date))}</td>
                <td data-label="Due date">{fmtDate(info.dueDate)}</td>
                <td data-label="Status">
                  <span className={`badge ${info.status}`}>
                    {info.status === 'overdue' ? 'Overdue' : info.status === 'duesoon' ? 'Due soon' : 'OK'}
                  </span>
                </td>
                <td data-label="">
                  <div className="row-actions">
                    <button
                      className="btn whatsapp"
                      onClick={() => openWhatsApp(s.phone, buildReminderMessage(academyName, s, info))}
                    >
                      WhatsApp
                    </button>
                    <button className="btn primary" onClick={() => onRecordPayment(s.id)}>Record payment</button>
                    <button className="btn subtle" onClick={() => onEditStudent(s)}>Edit</button>
                    <button className="btn subtle" onClick={() => onArchiveStudent(s)}>Archive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
