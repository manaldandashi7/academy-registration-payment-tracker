import { useEffect, useRef, useState } from 'react';
import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';

// A small "more actions" (⋯) menu, used wherever a row has actions that don't
// need to be one-tap buttons (edit, archive, permanently delete). Closes on
// an outside click or Escape.
export default function RowMenu({ items }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="row-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('more_actions')}
      >
        <Icon name="dots" size={16} />
      </button>
      {open && (
        <div className="row-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`row-menu-item ${item.danger ? 'danger' : ''}`}
              onClick={() => { setOpen(false); item.onClick(); }}
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
