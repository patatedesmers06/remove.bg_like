import { createClient } from '@supabase/supabase-js'

// Guard: This file must NEVER be imported on the client side
if (typeof window !== 'undefined') {
  throw new Error(
    'supabase-admin.ts must not be imported on the client side. ' +
    'Use lib/supabase.ts for client-side operations.'
  )
}

// Server-only Supabase client with Service Role Key
// This bypasses RLS and should only be used in API routes / server components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
