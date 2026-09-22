import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Keeps the signed-in session in the browser (localStorage) across page
    // reloads, and silently renews it before it expires. With these off, every
    // refresh looked like a fresh visit and sent people back to the login screen.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
