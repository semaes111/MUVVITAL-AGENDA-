import { madridLocalToUtc, shiftDateKey } from '../domain/schedule'
import type { Booking, BookingUnit, Member } from '../types'

export const DEMO_MEMBER: Member = {
  id: '10000000-0000-4000-8000-000000000001',
  userId: '20000000-0000-4000-8000-000000000001',
  organizationId: '30000000-0000-4000-8000-000000000001',
  displayName: 'Profesional 1',
  role: 'coordinator',
}

export const DEMO_UNITS: BookingUnit[] = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    code: 'SUITE_CONSULTA_EXPLORACION',
    name: 'Suite Consulta + Exploración',
    shortName: 'Consulta + Exploración',
    accent: 'deep-blue',
    roomNames: ['Consulta', 'Exploración'],
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    code: 'PODOLOGIA',
    name: 'Sala de Podología',
    shortName: 'Podología',
    accent: 'ocean',
    roomNames: ['Podología'],
  },
]

type DemoBookingSeed = {
  id: string
  date: string
  startTime: string
  endTime: string
  unitIndex: 0 | 1
  professionalName: string
  memberId: string
  kind?: Booking['kind']
  canManage?: boolean
}

export function createDemoBookings(todayKey: string): Booking[] {
  const seeds: DemoBookingSeed[] = [
    {
      id: 'demo-1',
      date: todayKey,
      startTime: '09:00',
      endTime: '11:30',
      unitIndex: 0,
      professionalName: 'Profesional 1',
      memberId: DEMO_MEMBER.id,
      kind: 'standing_allocation',
      canManage: true,
    },
    {
      id: 'demo-2',
      date: todayKey,
      startTime: '10:30',
      endTime: '13:00',
      unitIndex: 1,
      professionalName: 'Profesional 2',
      memberId: '10000000-0000-4000-8000-000000000002',
    },
    {
      id: 'demo-3',
      date: todayKey,
      startTime: '15:30',
      endTime: '18:00',
      unitIndex: 0,
      professionalName: 'Profesional 3',
      memberId: '10000000-0000-4000-8000-000000000003',
    },
    {
      id: 'demo-4',
      date: shiftDateKey(todayKey, 1),
      startTime: '08:30',
      endTime: '12:00',
      unitIndex: 0,
      professionalName: 'Profesional 4',
      memberId: '10000000-0000-4000-8000-000000000004',
    },
    {
      id: 'demo-5',
      date: shiftDateKey(todayKey, 2),
      startTime: '16:00',
      endTime: '20:00',
      unitIndex: 1,
      professionalName: 'Profesional 1',
      memberId: DEMO_MEMBER.id,
      canManage: true,
    },
    {
      id: 'demo-6',
      date: shiftDateKey(todayKey, 4),
      startTime: '14:00',
      endTime: '17:30',
      unitIndex: 0,
      professionalName: 'Profesional 2',
      memberId: '10000000-0000-4000-8000-000000000002',
    },
  ]

  return seeds.map((seed) => {
    const unit = DEMO_UNITS[seed.unitIndex]
    return {
      id: seed.id,
      organizationId: DEMO_MEMBER.organizationId,
      bookingUnitId: unit.id,
      bookingUnitCode: unit.code,
      bookingUnitName: unit.name,
      memberId: seed.memberId,
      professionalName: seed.professionalName,
      startsAt: madridLocalToUtc(seed.date, seed.startTime),
      endsAt: madridLocalToUtc(seed.date, seed.endTime),
      kind: seed.kind ?? 'ad_hoc',
      status: 'confirmed',
      syncStatus: 'synced',
      canManage: seed.canManage ?? false,
    }
  })
}
