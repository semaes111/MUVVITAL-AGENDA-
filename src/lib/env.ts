const EXPECTED_SUPABASE_URL = 'https://cumkjqkknicjrnvwejgk.supabase.co'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabaseConfiguration =
  configuredUrl === EXPECTED_SUPABASE_URL && configuredKey
    ? { url: configuredUrl, publishableKey: configuredKey }
    : null

export function getConfigurationIssue(): string | null {
  if (!configuredUrl && !configuredKey) return null
  if (configuredUrl !== EXPECTED_SUPABASE_URL) {
    return `Este repositorio solo admite el proyecto Supabase autorizado ${EXPECTED_SUPABASE_URL}.`
  }
  if (!configuredKey) return 'Falta VITE_SUPABASE_PUBLISHABLE_KEY.'
  return null
}

export { EXPECTED_SUPABASE_URL }
