import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { supabaseConfiguration } from './env'

let client: SupabaseClient | null | undefined

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client
  if (!supabaseConfiguration) {
    client = null
    return client
  }

  client = createClient(
    supabaseConfiguration.url,
    supabaseConfiguration.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    },
  )
  return client
}
