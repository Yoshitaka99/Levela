import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client: disables browser-only features (localStorage, auto-refresh)
// to prevent hanging in Node.js server component contexts
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)
