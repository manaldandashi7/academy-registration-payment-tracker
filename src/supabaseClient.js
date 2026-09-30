import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  );
}

// "Remember me" on the login screen decides where the session is kept:
// ticked -> localStorage (survives closing the browser), unticked ->
// sessionStorage (gone once the browser/tab is closed). The choice itself is
// stored in localStorage so it's known before any session is read. No flag at
// all (sessions from before this existed) counts as "remembered".
const REMEMBER_KEY = 'mahara.rememberMe';

export function setRememberMe(on) {
  try { localStorage.setItem(REMEMBER_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}

function sessionStore() {
  try { return localStorage.getItem(REMEMBER_KEY) === '0' ? sessionStorage : localStorage; } catch { return null; }
}

const authStorage = {
  getItem: (key) => { try { return sessionStore()?.getItem(key) ?? null; } catch { return null; } },
  setItem: (key, value) => { try { sessionStore()?.setItem(key, value); } catch { /* storage blocked */ } },
  // Clear both places, so switching the choice never leaves an old session behind.
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch { /* storage blocked */ }
    try { sessionStorage.removeItem(key); } catch { /* storage blocked */ }
  },
};

export const supabase = createClient(url, anonKey, {
  auth: {
    // Keeps the signed-in session in the browser across page reloads (where
    // exactly depends on "Remember me", above), and silently renews it before
    // it expires. With these off, every refresh looked like a fresh visit and
    // sent people back to the login screen.
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
