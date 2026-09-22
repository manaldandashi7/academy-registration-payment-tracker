import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';

const LEVELS = [1, 2, 3, 4];

export default function Sidebar({ view, students, onNavigate, settings, onAddStudent, onOpenSettings, onSignOut }) {
  const { t, lang, setLang } = useLanguage();
  const initial = (settings.academy_name || 'A').trim().charAt(0).toUpperCase();
  const countFor = (level) => students.filter((s) => Number(s.level) === level).length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">
          {settings.logo_url ? <img src={settings.logo_url} alt="Academy logo" /> : initial}
        </div>
        <div className="brand-name">{settings.academy_name || 'Your Academy'}</div>
      </div>

      <button className="btn-add-student" onClick={() => onAddStudent(null)}>
        <Icon name="userPlus" size={17} />
        {t('add_student')}
      </button>

      <nav>
        <div className="nav-label">{t('overview')}</div>
        <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
          <Icon name="home" />
          {t('dashboard')}
        </button>

        <div className="nav-label">{t('finance')}</div>
        <button className={`nav-item ${view === 'income' ? 'active' : ''}`} onClick={() => onNavigate('income')}>
          <Icon name="chart" />
          {t('income_report')}
        </button>
        <button className={`nav-item ${view === 'expenses' ? 'active' : ''}`} onClick={() => onNavigate('expenses')}>
          <Icon name="wallet" />
          {t('nav_expenses')}
        </button>

        <div className="nav-label">{t('levels')}</div>
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`nav-item level-item lv-${l} ${view === `level-${l}` ? 'active' : ''}`}
            onClick={() => onNavigate(`level-${l}`)}
          >
            <span className="level-chip">{l}</span>
            {t('level', { n: l })}
            <span className="nav-count">{countFor(l)}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="lang-toggle" role="group" aria-label="Language">
          <button type="button" className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>العربية</button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>English</button>
        </div>
        <button className="btn-settings" onClick={onOpenSettings}>
          <Icon name="sliders" size={16} />
          {t('settings')}
        </button>
        <button className="btn-settings" onClick={onSignOut}>
          <Icon name="logout" size={16} />
          {t('sign_out')}
        </button>
      </div>
    </aside>
  );
}
