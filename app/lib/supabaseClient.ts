import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedSupabase: SupabaseClient | null = null;

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  if (!cachedSupabase) {
    cachedSupabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  return cachedSupabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];

    return typeof value === 'function' ? value.bind(client) : value;
  },
});
