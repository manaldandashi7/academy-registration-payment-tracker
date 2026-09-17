const LEVELS = [1, 2, 3, 4];

export default function Sidebar({ view, onNavigate, settings, onAddStudent, onOpenSettings, onSignOut }) {
  const initial = (settings.academy_name || 'A').trim().charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">
          {settings.logo_url ? <img src={settings.logo_url} alt="Academy logo" /> : initial}
        </div>
        <div className="brand-name">{settings.academy_name || 'Your Academy'}</div>
      </div>

      <nav>
        <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
          <span className="nav-dot" />Dashboard
        </button>
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`nav-item ${view === `level-${l}` ? 'active' : ''}`}
            onClick={() => onNavigate(`level-${l}`)}
          >
            <span className="nav-dot" />Level {l}
          </button>
        ))}
        <button className={`nav-item ${view === 'income' ? 'active' : ''}`} onClick={() => onNavigate('income')}>
          <span className="nav-dot" />Income report
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="btn-add-student" onClick={() => onAddStudent(null)}>+ Add student</button>
        <button className="btn-settings" onClick={onOpenSettings}>Settings</button>
        <button className="btn-settings" onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
