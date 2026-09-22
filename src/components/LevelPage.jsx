import { computeStatus, fmtDate, parseISODateLocal } from '../lib/dateUtils';
import { buildReminderMessage, openWhatsApp } from '../lib/whatsapp';
import Icon, { Friend } from './Icons.jsx';
import RowMenu from './RowMenu.jsx';
import { useLanguage } from '../i18n.jsx';

export default function LevelPage({ level, students, payments, academyName, onAddStudent, onEditStudent, onArchiveStudent, onDeleteStudent, onRecordPayment }) {
  const { t, locale } = useLanguage();
  const rows = students
    .filter((s) => Number(s.level) === level)
    .map((s) => ({ s, info: computeStatus(s, payments) }))
    .sort((a, b) => a.s.name.localeCompare(b.s.name));

  const statusLabel = (status) => (status === 'overdue' ? t('overdue') : status === 'duesoon' ? t('due_soon') : t('status_ok'));

  return (
    <>
      <div className={`page-header lv-${level}`}>
        <div className="page-title-row">
          <span className="level-chip level-chip-lg">{level}</span>
          <div>
            <h1>{t('level', { n: level })}</h1>
            <div className="today">{t('students_count', { n: rows.length })}</div>
          </div>
        </div>
        <button className="btn-cta" onClick={() => onAddStudent(level)}>
          <Icon name="userPlus" size={17} />
          {t('add_student')}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <Friend tone="green" />
          <div className="big">{t('no_students_level', { n: level })}</div>
          <p>{t('add_student_hint')}</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('col_name')}</th><th>{t('col_phone')}</th><th>{t('col_class')}</th><th>{t('col_enrolled')}</th><th>{t('col_due_date')}</th><th>{t('col_status')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, info }) => (
              <tr key={s.id}>
                <td data-label={t('col_name')}>
                  <div className="student-name">{s.name}</div>
                  {s.address && <div className="student-sub">{s.address}</div>}
                </td>
                <td data-label={t('col_phone')} dir="ltr" className="phone-cell">{s.phone}</td>
                <td data-label={t('col_class')}>{s.class}</td>
                <td data-label={t('col_enrolled')}>{fmtDate(parseISODateLocal(s.enrollment_date), locale)}</td>
                <td data-label={t('col_due_date')}>{fmtDate(info.dueDate, locale)}</td>
                <td data-label={t('col_status')}>
                  <span className={`badge ${info.status}`}>{statusLabel(info.status)}</span>
                </td>
                <td data-label="">
                  <div className="row-actions">
                    <button
                      className="btn whatsapp"
                      onClick={() => openWhatsApp(s.phone, buildReminderMessage(academyName, s, info), t)}
                    >
                      {t('whatsapp')}
                    </button>
                    <button className="btn primary" onClick={() => onRecordPayment(s.id)}>{t('record_payment')}</button>
                    <RowMenu
                      items={[
                        { label: t('edit'), icon: 'edit', onClick: () => onEditStudent(s) },
                        { label: t('archive'), icon: 'box', onClick: () => onArchiveStudent(s) },
                        { label: t('delete_student'), icon: 'trash', danger: true, onClick: () => onDeleteStudent(s) },
                      ]}
                    />
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
