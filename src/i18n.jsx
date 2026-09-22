import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from './i18n-strings.js';

export { translate };

const STORAGE_KEY = 'academyLanguage';

const LanguageContext = createContext(null);

function readStoredLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    // storage can be blocked; fall back to the default
  }
  return 'ar';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLanguage);

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const t = (key, params = {}) => translate(lang, key, params);
    return {
      lang,
      setLang,
      t,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      // Latin digits in Arabic too, so dates match phone numbers and amounts.
      locale: lang === 'ar' ? 'ar-u-nu-latn' : 'en',
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
