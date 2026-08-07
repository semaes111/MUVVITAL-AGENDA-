export type MemberRole = 'professional' | 'coordinator' | 'technical_admin'

export type Member = {
  id: string
  userId: string
  organizationId: string
  displayName: string
  role: MemberRole
  avatarUrl?: string
}

export type BookingUnitCode = 'SUITE_CONSULTA_EXPLORACION' | 'PODOLOGIA'

export type BookingUnit = {
  id: string
  code: BookingUnitCode
  name: string
  shortName: string
  accent: 'deep-blue' | 'ocean'
  roomNames: string[]
}

export type Booking = {
  id: string
  organizationId: string
  bookingUnitId: string
  bookingUnitCode: BookingUnitCode
  bookingUnitName: string
  memberId: string
  professionalName: string
  avatarUrl?: string
  startsAt: string
  endsAt: string
  kind: 'ad_hoc' | 'standing_allocation'
  status: 'confirmed' | 'cancelled'
  syncStatus: 'pending' | 'synced' | 'failed'
  canManage: boolean
}

export type CreateBookingInput = {
  bookingUnitId: string
  date: string
  startTime: string
  endTime: string
  kind?: 'ad_hoc' | 'standing_allocation'
}

export type AgendaBootstrap = {
  member: Member
  units: BookingUnit[]
}
