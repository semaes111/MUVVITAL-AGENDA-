import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.2'

type OutboxJob = {
  id: number
  organization_id: string
  booking_id: string
  action: 'upsert' | 'cancel'
  payload: Record<string, unknown>
  attempts: number
}

type BookingRecord = {
  id: string
  booking_unit_id: string
  member_id: string
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'cancelled'
}

const required = (name: string) => {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Missing required secret: ${name}`)
  return value
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const cronSecret = required('CRON_SECRET')
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      required('SUPABASE_URL'),
      supabaseSecretKey(),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const calendarId = required('GOOGLE_CALENDAR_ID')
    const { data, error } = await supabase.rpc('agenda_claim_outbox_batch', { p_limit: 20 })
    if (error) throw new Error(`Unable to claim outbox jobs: ${error.code}`)

    const jobs = (data ?? []) as OutboxJob[]
    if (jobs.length === 0) return json({ claimed: 0, completed: 0, failed: 0 })

    let accessToken: string
    try {
      accessToken = await getGoogleAccessToken()
    } catch (caught) {
      await Promise.all(jobs.map((job) => markJobFailed(supabase, job, caught)))
      return json({ claimed: jobs.length, completed: 0, failed: jobs.length })
    }

    let completed = 0
    let failed = 0

    for (const job of jobs) {
      try {
        const { data: booking, error: bookingError } = await supabase
          .from('agenda_bookings')
          .select('id,booking_unit_id,member_id,starts_at,ends_at,status')
          .eq('id', job.booking_id)
          .single<BookingRecord>()
        if (bookingError) throw new Error(`Booking lookup failed: ${bookingError.code}`)

        const [{ data: unit, error: unitError }, { data: member, error: memberError }] =
          await Promise.all([
            supabase
              .from('agenda_booking_units')
              .select('name')
              .eq('id', booking.booking_unit_id)
              .single<{ name: string }>(),
            supabase
              .from('agenda_members')
              .select('display_name')
              .eq('id', booking.member_id)
              .single<{ display_name: string }>(),
          ])
        if (unitError || memberError) throw new Error('Booking directory lookup failed')

        const eventId = deterministicEventId(booking.id)
        if (job.action === 'cancel' || booking.status === 'cancelled') {
          await deleteEvent(accessToken, calendarId, eventId)
        } else {
          await upsertEvent(accessToken, calendarId, eventId, {
            summary: `${unit.name} — ${member.display_name}`,
            description: 'Reserva interna de espacio MÜV Vital. Editar únicamente en agenda.muvvital.com.',
            start: { dateTime: booking.starts_at, timeZone: 'Europe/Madrid' },
            end: { dateTime: booking.ends_at, timeZone: 'Europe/Madrid' },
            extendedProperties: { private: { bookingId: booking.id, source: 'muvvital-agenda' } },
          })
        }

        const now = new Date().toISOString()
        const [linkUpdate, outboxUpdate] = await Promise.all([
          supabase
            .from('agenda_calendar_event_links')
            .update({
              google_calendar_id: calendarId,
              google_event_id: eventId,
              sync_status: 'synced',
              last_error: null,
              last_synced_at: now,
            })
            .eq('booking_id', booking.id),
          supabase
            .from('agenda_integration_outbox')
            .update({ status: 'completed', last_error: null, locked_at: null })
            .eq('id', job.id),
        ])
        assertDatabaseUpdate(linkUpdate.error, 'Calendar link completion failed')
        assertDatabaseUpdate(outboxUpdate.error, 'Outbox completion failed')
        completed += 1
      } catch (caught) {
        await markJobFailed(supabase, job, caught)
        failed += 1
      }
    }

    return json({ claimed: jobs.length, completed, failed })
  } catch (caught) {
    return json({ error: safeError(caught) }, 500)
  }
})

function supabaseSecretKey(): string {
  const bundledKeys = Deno.env.get('SUPABASE_SECRET_KEYS')?.trim()
  if (bundledKeys) {
    try {
      const parsed = JSON.parse(bundledKeys) as Record<string, unknown>
      const defaultKey = parsed.default
      if (typeof defaultKey === 'string' && defaultKey.trim()) return defaultKey.trim()
    } catch {
      throw new Error('SUPABASE_SECRET_KEYS is not valid JSON')
    }
    throw new Error('SUPABASE_SECRET_KEYS does not contain the default key')
  }

  const explicitKey = Deno.env.get('SUPABASE_SECRET_KEY')?.trim()
  if (explicitKey) return explicitKey

  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  if (legacyKey) return legacyKey

  throw new Error('Missing required secret: SUPABASE_SECRET_KEYS')
}

async function markJobFailed(
  supabase: SupabaseClient,
  job: OutboxJob,
  caught: unknown,
) {
  const message = safeError(caught)
  const attempts = job.attempts + 1
  const delayMinutes = Math.min(360, 2 ** Math.min(attempts, 8))
  const [linkUpdate, outboxUpdate] = await Promise.all([
    supabase
      .from('agenda_calendar_event_links')
      .update({ sync_status: 'failed', last_error: message })
      .eq('booking_id', job.booking_id),
    supabase
      .from('agenda_integration_outbox')
      .update({
        status: 'failed',
        attempts,
        last_error: message,
        locked_at: null,
        available_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      })
      .eq('id', job.id),
  ])

  const persistenceErrors = [linkUpdate.error?.code, outboxUpdate.error?.code].filter(Boolean)
  if (persistenceErrors.length > 0) {
    console.error('Unable to persist failed outbox job', {
      jobId: job.id,
      errorCodes: persistenceErrors,
    })
  }
}

function assertDatabaseUpdate(error: { code?: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.code ?? 'unknown'}`)
}

async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountEmail = required('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const privateKey = required('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replaceAll('\\n', '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3_300,
  }))
  const signingInput = `${header}.${payload}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  )
  const assertion = `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error(`Google OAuth failed with status ${response.status}`)
  const token = await response.json() as { access_token?: string }
  if (!token.access_token) throw new Error('Google OAuth returned no access token')
  return token.access_token
}

async function upsertEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Record<string, unknown>,
) {
  const eventUrl = `${eventsBase(calendarId)}/${encodeURIComponent(eventId)}`
  const update = await googleRequest(eventUrl, accessToken, 'PUT', { id: eventId, ...event })
  if (update.status !== 404) {
    if (!update.ok) throw new Error(`Google event update failed with status ${update.status}`)
    return
  }

  const insert = await googleRequest(eventsBase(calendarId), accessToken, 'POST', {
    id: eventId,
    ...event,
  })
  if (!insert.ok && insert.status !== 409) {
    throw new Error(`Google event insert failed with status ${insert.status}`)
  }
}

async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  const response = await googleRequest(
    `${eventsBase(calendarId)}/${encodeURIComponent(eventId)}`,
    accessToken,
    'DELETE',
  )
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(`Google event deletion failed with status ${response.status}`)
  }
}

function googleRequest(
  url: string,
  accessToken: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
) {
  return fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function eventsBase(calendarId: string) {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
}

function deterministicEventId(bookingId: string) {
  return `muv${bookingId.replaceAll('-', '').toLowerCase()}`
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  return bytes.buffer
}

function base64Url(value: string) {
  return base64UrlBytes(new TextEncoder().encode(value))
}

function base64UrlBytes(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected integration error'
  return message.replace(/[\r\n\t]+/g, ' ').slice(0, 500)
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
