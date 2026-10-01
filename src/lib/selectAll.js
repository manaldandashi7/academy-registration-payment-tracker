import { supabase } from '../supabaseClient';

const PAGE_SIZE = 1000;

// Supabase hands back at most 1000 rows per request, silently dropping the
// rest - fine for students, but payments pass that within the first year.
// This reads a whole table page by page (ordered by id so pages never
// overlap or skip), returning the same { data, error } shape as a normal query.
export async function selectAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
