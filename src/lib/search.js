// Plain JS (no JSX) so the test suite can import it directly.

// Lowercases and strips the differences people don't type consistently:
// Latin accents, Arabic tashkeel/tatweel, and the common Arabic letter
// variants - so "احمد" finds "أحمد", and "فاطمه" finds "فاطمة".
export function normalizeForSearch(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Latin combining accents
    .replace(/[ً-ٰٟـ]/g, '') // Arabic tashkeel + tatweel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

/** True if every word of `query` appears somewhere across `fields`. */
export function matchesSearch(query, fields) {
  const haystack = normalizeForSearch(fields.filter(Boolean).join(' '));
  return normalizeForSearch(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}
