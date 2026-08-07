import { z } from 'zod'

import { madridLocalToUtc, validateBookingWindow } from '../domain/schedule'
import type { AgendaBootstrap, Booking, BookingUnit, CreateBookingInput, Member } from '../types'
import { getSupabaseClient } from './supabase'

const memberRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  display_name: z.string().min(1),
  role: z.enum(['professional', 'coordinator', 'technical_admin']),
  avatar_url: z.string().url().nullable(),
})

const unitRowSchema = z.object({
  id: z.string().uuid(),
  code: z.enum(['SUITE_CONSULTA_EXPLORACION', 'PODOLOGIA']),
  name: z.string().min(1),
  room_names: z.array(z.string()),
})

const bookingRowSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  booking_unit_id: z.string().uuid(),
  booking_unit_code: z.enum(['SUITE_CONSULTA_EXPLORACION', 'PODOLOGIA']),
  booking_unit_name: z.string(),
  member_id: z.string().uuid(),
  professional_name: z.string(),
  avatar_url: z.string().url().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  kind: z.enum(['ad_hoc', 'standing_allocation']),
  status: z.enum(['confirmed', 'cancelled']),
  sync_status: z.enum(['pending', 'synced', 'failed']),
  can_manage: z.boolean(),
})

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase no está configurado')
  return client
}

export async function loadBootstrap(userId: string): Promise<AgendaBootstrap | null> {
  const client = requireClient()
  let memberResult = await client
    .from('agenda_members')
    .select('id,user_id,organization_id,display_name,role,avatar_url')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (memberResult.error) throw memberResult.error
  if (!memberResult.data) {
    const claimResult = await client.rpc('agenda_claim_invitation')
    if (claimResult.error || claimResult.data !== true) return null
    memberResult = await client
      .from('agenda_members')
      .select('id,user_id,organization_id,display_name,role,avatar_url')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (memberResult.error) throw memberResult.error
    if (!memberResult.data) return null
  }
  const memberRow = memberRowSchema.parse(memberResult.data)

  const unitsResult = await client
    .from('agenda_booking_unit_directory')
    .select('id,code,name,room_names')
    .eq('organization_id', memberRow.organization_id)
    .eq('is_active', true)
    .order('sort_order')

  if (unitsResult.error) throw unitsResult.error
  const unitRows = z.array(unitRowSchema).parse(unitsResult.data ?? [])

  const member: Member = {
    id: memberRow.id,
    userId: memberRow.user_id,
    organizationId: memberRow.organization_id,
    displayName: memberRow.display_name,
    role: memberRow.role,
    avatarUrl: memberRow.avatar_url ?? undefined,
  }

  const units: BookingUnit[] = unitRows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.code === 'PODOLOGIA' ? 'Podología' : 'Consulta + Exploración',
    accent: row.code === 'PODOLOGIA' ? 'ocean' : 'deep-blue',
    roomNames: row.room_names,
  }))

  return { member, units }
}

export async function loadBookings(
  organizationId: string,
  fromDateKey: string,
  untilDateKey: string,
): Promise<Booking[]> {
  const client = requireClient()
  const from = madridLocalToUtc(fromDateKey, '00:00')
  const until = madridLocalToUtc(untilDateKey, '00:00')
  const result = await client
    .from('agenda_booking_calendar')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'confirmed')
    .gte('starts_at', from)
    .lt('starts_at', until)
    .order('starts_at')

  if (result.error) throw result.error
  return z.array(bookingRowSchema).parse(result.data ?? []).map(mapBookingRow)
}

function mapBookingRow(row: z.infer<typeof bookingRowSchema>): Booking {
  return {
    id: row.id,
    organizationId: row.organization_id,
    bookingUnitId: row.booking_unit_id,
    bookingUnitCode: row.booking_unit_code,
    bookingUnitName: row.booking_unit_name,
    memberId: row.member_id,
    professionalName: row.professional_name,
    avatarUrl: row.avatar_url ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    kind: row.kind,
    status: row.status,
    syncStatus: row.sync_status,
    canManage: row.can_manage,
  }
}

export async function createLiveBooking(input: CreateBookingInput): Promise<string> {
  const validated = validateBookingWindow(input)
  if (!validated.success) throw new Error(validated.error)

  const client = requireClient()
  const result = await client.rpc('agenda_create_booking', {
    p_booking_unit_id: input.bookingUnitId,
    p_starts_at: validated.startsAt,
    p_ends_at: validated.endsAt,
    p_kind: input.kind ?? 'ad_hoc',
  })

  if (result.error) {
    if (result.error.code === '23P01') {
      throw new Error('Ese intervalo acaba de reservarse. Elige otra hora o sala.')
    }
    throw result.error
  }
  return z.string().uuid().parse(result.data)
}

export async function cancelLiveBooking(bookingId: string): Promise<void> {
  const client = requireClient()
  const result = await client.rpc('agenda_cancel_booking', { p_booking_id: bookingId })
  if (result.error) throw result.error
}

export async function rescheduleLiveBooking(
  bookingId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  const validated = validateBookingWindow({ date, startTime, endTime })
  if (!validated.success) throw new Error(validated.error)
  const client = requireClient()
  const result = await client.rpc('agenda_reschedule_booking', {
    p_booking_id: bookingId,
    p_starts_at: validated.startsAt,
    p_ends_at: validated.endsAt,
  })
  if (result.error) {
    if (result.error.code === '23P01') {
      throw new Error('Ese intervalo acaba de reservarse. Elige otra hora o sala.')
    }
    throw result.error
  }
}
