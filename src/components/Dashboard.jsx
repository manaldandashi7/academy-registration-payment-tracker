import { computeStatus, fmtDate } from '../lib/dateUtils';
import { buildReminderMessage, openWhatsApp } from '../lib/whatsapp';
import Icon, { Friend } from './Icons.jsx';
import RowMenu from './RowMenu.jsx';
import { useLanguage } from '../i18n.jsx';

const LEVELS = [1, 2, 3, 4];

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'good_morning';
  if (h < 18) return 'good_afternoon';
  return 'good_evening';
}

function dueText(info, t) {
  const d = info.diffDays;
  if (d < 0) return t('overdue_by', { n: -d });
  if (d === 0) return t('due_today');
  return t('due_in', { n: d });
}

export default function Dashboard({ students, payments, academyName, onRecordPayment, onAddStudent, onNavigate, onEditStudent, onArchiveStudent, onDeleteStudent }) {
  const { t, locale } = useLanguage();
  const withStatus = students.map((s) => ({ s, info: computeStatus(s, payments) }));
  const overdue = withStatus.filter((x) => x.info.status === 'overdue').sort((a, b) => a.info.diffDays - b.info.diffDays);
  const dueSoon = withStatus.filter((x) => x.info.status === 'duesoon').sort((a, b) => a.info.diffDays - b.info.diffDays);
  const ok = withStatus.filter((x) => x.info.status === 'ok');
  const needsAttention = [...overdue, ...dueSoon];

  const today = new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
  const summary = students.length === 0
    ? t('summary_empty')
    : needsAttention.length === 0
      ? t('summary_ok')
      : t('summary_attention', { n: needsAttention.length });

  const stats = [
    { key: 'overdue', icon: 'alert', num: overdue.length, label: t('overdue') },
    { key: 'duesoon', icon: 'clock', num: dueSoon.length, label: t('due_soon') },
    { key: 'ok', icon: 'check', num: ok.length, label: t('paid_up') },
    { key: 'total', icon: 'users', num: students.length, label: t('students') },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{t(greetingKey())}</h1>
          <div className="today">{today} · {summary}</div>
        </div>
        <button className="btn-cta" onClick={() => onAddStudent(null)}>
          <Icon name="userPlus" size={17} />
          {t('add_student')}
        </button>
      </div>

      <div className="stats-row">
        {stats.map((st, i) => (
          <div key={st.key} className={`stat-card ${st.key}`} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="stat-icon"><Icon name={st.icon} size={20} /></div>
            <div>
              <div className="num">{st.num}</div>
              <div className="label">{st.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">{t('your_levels')}</div>
      <div className="level-grid">
        {LEVELS.map((l) => {
          const inLevel = withStatus.filter((x) => Number(x.s.level) === l);
          const late = inLevel.filter((x) => x.info.status === 'overdue').length;
          return (
            <button key={l} className={`level-card lv-${l}`} onClick={() => onNavigate(`level-${l}`)}>
              <span className="level-card-num">{l}</span>
              <span className="level-card-body">
                <span className="level-card-name">{t('level', { n: l })}</span>
                <span className="level-card-count">{t('students_count', { n: inLevel.length })}</span>
              </span>
              {late > 0 && <span className="level-card-flag">{t('n_overdue', { n: late })}</span>}
            </button>
          );
        })}
      </div>

      <div className="section-title">{t('needs_attention')}</div>

      {students.length === 0 ? (
        <div className="empty-state">
          <Friend tone="green" />
          <div className="big">{t('no_students_yet')}</div>
          <p>{t('no_students_help')}</p>
          <button className="btn-cta" onClick={() => onAddStudent(null)}>
            <Icon name="userPlus" size={17} />
            {t('add_first_student')}
          </button>
        </div>
      ) : needsAttention.length === 0 ? (
        <div className="empty-state">
          <Friend tone="yellow" />
          <div className="big">{t('all_caught_up')}</div>
          <p>{t('nobody_due')}</p>
        </div>
      ) : (
        <div className="attention-list">
          {needsAttention.map(({ s, info }) => (
            <div key={s.id} className={`attention-row lv-${s.level}`}>
              <div className="avatar">{(s.name || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="attention-who">
                <div className="student-name">{s.name}</div>
                <div className="student-sub">{t('level_class', { level: s.level, klass: s.class })}</div>
              </div>
              <div className="attention-due">
                <span className={`badge ${info.status}`}>{dueText(info, t)}</span>
                <div className="student-sub">{fmtDate(info.dueDate, locale)}</div>
              </div>
              <div className="row-actions">
                <button
                  className="btn whatsapp"
                  onClick={() => openWhatsApp(s.phone, buildReminderMessage(academyName, s, info), t)}
                >
                  <Icon name="chat" size={14} />
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
            </div>
          ))}
        </div>
      )}
    </>
  );
}
