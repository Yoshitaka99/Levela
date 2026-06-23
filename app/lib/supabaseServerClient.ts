import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SupabaseServerClient = SupabaseClient;

let cachedSupabaseServer: SupabaseServerClient | null = null;

export function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  if (!cachedSupabaseServer) {
    // Server-side Supabase client: disables browser-only features to avoid
    // hanging in Node.js server component contexts.
    cachedSupabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return cachedSupabaseServer;
}

export const supabaseServer = new Proxy({} as SupabaseServerClient, {
  get(_target, prop) {
    const client = getSupabaseServer();
    const value = client[prop as keyof SupabaseServerClient];

    return typeof value === 'function' ? value.bind(client) : value;
  },
});
