import { createClient } from '@supabase/supabase-js'

// Public Supabase client — safe to use on client side
// This is the SINGLE source of truth for the browser client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
