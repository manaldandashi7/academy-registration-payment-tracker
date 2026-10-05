import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './components/Icons.jsx';
import { useLanguage } from './i18n.jsx';

// Replaces the browser's native confirm()/alert() with a dialog styled like
// the rest of the app. Both are Promise-based so call sites can just
// `await confirm(...)` / `await notify(...)` the same way they used to call
// the native versions. `toast(message)` is the quiet one: a short success
// message at the bottom of the screen that disappears by itself.
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const { t, dir } = useLanguage();
  const [dialog, setDialog] = useState(null); // { kind, title, message, danger, confirmLabel, cancelLabel, resolve }
  const [toastMsg, setToastMsg] = useState(null); // { id, message }
  const toastTimer = useRef(null);

  const toast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToastMsg({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToastMsg(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setDialog({ kind: 'confirm', ...opts, resolve });
  }), []);

  const notify = useCallback((opts) => new Promise((resolve) => {
    setDialog({ kind: 'notify', ...opts, resolve });
  }), []);

  const close = useCallback((result) => {
    setDialog((current) => {
      current?.resolve?.(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => { if (e.key === 'Escape') close(dialog.kind === 'confirm' ? false : undefined); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <DialogContext.Provider value={{ confirm, notify, toast }}>
      {children}
      {toastMsg && (
        <div key={toastMsg.id} className="toast" dir={dir} role="status" aria-live="polite" onClick={() => setToastMsg(null)}>
          <span className="toast-icon"><Icon name="check" size={16} /></span>
          <span>{toastMsg.message}</span>
        </div>
      )}
      {dialog && (
        <div
          className="overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(dialog.kind === 'confirm' ? false : undefined); }}
        >
          <div className="modal dialog-modal" role="alertdialog" aria-modal="true">
            <div className="modal-head">
              <div className={`modal-head-icon ${dialog.danger ? 'danger' : 'ok'}`}>
                <Icon name={dialog.danger ? 'alert' : 'check'} size={22} />
              </div>
              {dialog.title && <h2>{dialog.title}</h2>}
            </div>
            <p className="dialog-message">{dialog.message}</p>
            <div className="modal-actions">
              {dialog.kind === 'confirm' && (
                <button type="button" className="btn ghost" autoFocus={dialog.danger} onClick={() => close(false)}>
                  {dialog.cancelLabel || t('cancel')}
                </button>
              )}
              <button
                type="button"
                className={dialog.danger ? 'btn danger' : 'btn-cta'}
                autoFocus={!dialog.danger}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel || (dialog.kind === 'confirm' ? t('continue') : t('close'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
}
