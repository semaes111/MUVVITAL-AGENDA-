import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const edgeFunction = readFileSync(
  join(process.cwd(), 'supabase/functions/sync-google-calendar/index.ts'),
  'utf8',
)
const supabaseConfig = readFileSync(
  join(process.cwd(), 'supabase/config.toml'),
  'utf8',
)

describe('contrato del worker de Google Calendar', () => {
  it('usa el llavero secreto vigente y conserva compatibilidad controlada', () => {
    expect(edgeFunction).toContain("Deno.env.get('SUPABASE_SECRET_KEYS')")
    expect(edgeFunction).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")
    expect(edgeFunction).not.toContain("required('SUPABASE_SECRET_KEY')")
  })

  it('no solicita un token Google cuando no hay trabajos', () => {
    expect(edgeFunction).toMatch(
      /if \(jobs\.length === 0\)[\s\S]{0,120}return json[\s\S]+accessToken = await getGoogleAccessToken\(\)/,
    )
  })

  it('comprueba las escrituras que confirman un trabajo', () => {
    expect(edgeFunction).toContain(
      "assertDatabaseUpdate(linkUpdate.error, 'Calendar link completion failed')",
    )
    expect(edgeFunction).toContain(
      "assertDatabaseUpdate(outboxUpdate.error, 'Outbox completion failed')",
    )
    expect(edgeFunction).toContain('Math.min(job.attempts + 1, 2_147_483_647)')
  })

  it('desactiva la verificación JWT del gateway y autentica dentro del handler', () => {
    expect(supabaseConfig).toMatch(
      /\[functions\.sync-google-calendar\][\s\S]+verify_jwt = false/,
    )
    expect(edgeFunction).toContain("required('CRON_SECRET')")
    expect(edgeFunction).toContain("request.headers.get('authorization')")
  })
})
