import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';

const GAP = 6;

// A small "more actions" (⋯) menu, used wherever a row has actions that don't
// need to be one-tap buttons (edit, archive, permanently delete). Closes on
// an outside click, Escape, scroll or resize.
//
// The list is portaled to <body> with fixed positioning rather than placed
// inside the row: tables sit in an overflow-x scroll container, and CSS forces
// that container to clip vertically too - so a menu opened on the last row
// got cut off. At page level nothing can clip it, and it opens upward when
// there isn't room below.
export default function RowMenu({ items }) {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const menuH = menuRef.current.offsetHeight;
    const fitsBelow = r.bottom + GAP + menuH <= window.innerHeight;
    const top = fitsBelow ? r.bottom + GAP : Math.max(GAP, r.top - GAP - menuH);
    // Align the menu's end edge with the button's end edge (right in English,
    // left in Arabic), same as before it was portaled.
    setPos(dir === 'rtl'
      ? { top, left: Math.max(GAP, r.left) }
      : { top, right: Math.max(GAP, window.innerWidth - r.right) });
  }, [open, dir]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDocDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    // A fixed-position menu would drift away from its row on scroll - close it instead.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useEffect(() => { if (!open) setPos(null); }, [open]);

  return (
    <div className="row-menu">
      <button
        ref={triggerRef}
        type="button"
        className="row-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('more_actions')}
      >
        <Icon name="dots" size={16} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="row-menu-list"
          role="menu"
          dir={dir}
          // Measured first (hidden), then placed - avoids a one-frame flash in the wrong spot.
          style={pos ? { top: pos.top, left: pos.left, right: pos.right } : { top: 0, left: 0, visibility: 'hidden' }}
        >
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
        </div>,
        document.body,
      )}
    </div>
  );
}
