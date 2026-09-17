import { computeStatus, fmtDate } from '../lib/dateUtils';
import { buildReminderMessage, openWhatsApp } from '../lib/whatsapp';

export default function Dashboard({ students, payments, academyName, onRecordPayment }) {
  const withStatus = students.map((s) => ({ s, info: computeStatus(s, payments) }));
  const overdue = withStatus.filter((x) => x.info.status === 'overdue').sort((a, b) => a.info.diffDays - b.info.diffDays);
  const dueSoon = withStatus.filter((x) => x.info.status === 'duesoon').sort((a, b) => a.info.diffDays - b.info.diffDays);
  const ok = withStatus.filter((x) => x.info.status === 'ok');
  const needsAttention = [...overdue, ...dueSoon];

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="today">{today}</div>
      </div>

      <div className="stats-row">
        <div className="stat-card overdue"><div className="num">{overdue.length}</div><div className="label">Overdue</div></div>
        <div className="stat-card duesoon"><div className="num">{dueSoon.length}</div><div className="label">Due soon</div></div>
        <div className="stat-card ok"><div className="num">{ok.length}</div><div className="label">Paid up</div></div>
      </div>

      <div className="section-title">Needs attention</div>

      {students.length === 0 ? (
        <div className="empty-state">
          <div className="big">No students yet</div>
          Click "+ Add student" to register your first one.
        </div>
      ) : needsAttention.length === 0 ? (
        <div className="empty-state">
          <div className="big">All caught up</div>
          Nobody is due or overdue right now.
        </div>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Level</th><th>Class</th><th>Due date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {needsAttention.map(({ s, info }) => (
              <tr key={s.id}>
                <td data-label="Name">
                  <div className="student-name">{s.name}</div>
                  <div className="student-sub">{s.phone}</div>
                </td>
                <td data-label="Level">Level {s.level}</td>
                <td data-label="Class">{s.class}</td>
                <td data-label="Due date">{fmtDate(info.dueDate)}</td>
                <td data-label="Status">
                  <span className={`badge ${info.status}`}>{info.status === 'overdue' ? 'Overdue' : 'Due soon'}</span>
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
