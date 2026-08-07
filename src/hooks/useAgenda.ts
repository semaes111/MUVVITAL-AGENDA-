import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  intervalsOverlap,
  madridLocalToUtc,
  shiftDateKey,
  startOfWeekKey,
  validateBookingWindow,
} from '../domain/schedule'
import {
  cancelLiveBooking,
  createLiveBooking,
  loadBookings,
  rescheduleLiveBooking,
} from '../lib/agenda-service'
import { createDemoBookings } from '../lib/demo-data'
import { getSupabaseClient } from '../lib/supabase'
import type { Booking, BookingUnit, CreateBookingInput, Member } from '../types'

type UseAgendaOptions = {
  mode: 'demo' | 'live'
  member: Member
  units: BookingUnit[]
  anchorDateKey: string
  todayKey: string
}

export function useAgenda({
  mode,
  member,
  units,
  anchorDateKey,
  todayKey,
}: UseAgendaOptions) {
  const [bookings, setBookings] = useState<Booking[]>(() =>
    mode === 'demo' ? createDemoBookings(todayKey) : [],
  )
  const [loading, setLoading] = useState(mode === 'live')
  const [error, setError] = useState<string | null>(null)
  const rangeStart = useMemo(() => startOfWeekKey(anchorDateKey), [anchorDateKey])
  const rangeEnd = useMemo(() => shiftDateKey(rangeStart, 14), [rangeStart])

  const refresh = useCallback(async () => {
    if (mode === 'demo') return
    try {
      const next = await loadBookings(member.organizationId, rangeStart, rangeEnd)
      setBookings(next)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la agenda')
    } finally {
      setLoading(false)
    }
  }, [member.organizationId, mode, rangeEnd, rangeStart])

  useEffect(() => {
    if (mode === 'demo') return
    let active = true
    void loadBookings(member.organizationId, rangeStart, rangeEnd)
      .then((next) => {
        if (!active) return
        setBookings(next)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'No se pudo cargar la agenda')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [member.organizationId, mode, rangeEnd, rangeStart])

  useEffect(() => {
    if (mode !== 'live') return
    const client = getSupabaseClient()
    if (!client) return

    const channel = client
      .channel(`agenda:${member.organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_bookings',
          filter: `organization_id=eq.${member.organizationId}`,
        },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [member.organizationId, mode, refresh])

  const createBooking = useCallback(
    async (input: CreateBookingInput) => {
      const validated = validateBookingWindow(input)
      if (!validated.success) throw new Error(validated.error)

      if (mode === 'live') {
        await createLiveBooking(input)
        await refresh()
        return
      }

      const conflict = bookings.some(
        (booking) =>
          booking.status === 'confirmed' &&
          booking.bookingUnitId === input.bookingUnitId &&
          intervalsOverlap(booking, validated),
      )
      if (conflict) {
        throw new Error('Ese intervalo ya está ocupado. Elige otra hora o sala.')
      }

      const unit = units.find((candidate) => candidate.id === input.bookingUnitId)
      if (!unit) throw new Error('La unidad de reserva no existe')
      setBookings((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          organizationId: member.organizationId,
          bookingUnitId: unit.id,
          bookingUnitCode: unit.code,
          bookingUnitName: unit.name,
          memberId: member.id,
          professionalName: member.displayName,
          avatarUrl: member.avatarUrl,
          startsAt: validated.startsAt,
          endsAt: validated.endsAt,
          kind: input.kind ?? 'ad_hoc',
          status: 'confirmed',
          syncStatus: 'synced',
          canManage: true,
        },
      ])
      setError(null)
    },
    [bookings, member, mode, refresh, units],
  )

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      if (mode === 'live') {
        await cancelLiveBooking(bookingId)
        await refresh()
        return
      }
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' as const, syncStatus: 'synced' as const }
            : booking,
        ),
      )
    },
    [mode, refresh],
  )

  const rescheduleBooking = useCallback(
    async (bookingId: string, input: Omit<CreateBookingInput, 'bookingUnitId'>) => {
      const validated = validateBookingWindow(input)
      if (!validated.success) throw new Error(validated.error)

      if (mode === 'live') {
        await rescheduleLiveBooking(
          bookingId,
          input.date,
          input.startTime,
          input.endTime,
        )
        await refresh()
        return
      }

      const original = bookings.find((booking) => booking.id === bookingId)
      if (!original) throw new Error('La reserva ya no existe')
      const conflict = bookings.some(
        (booking) =>
          booking.id !== bookingId &&
          booking.status === 'confirmed' &&
          booking.bookingUnitId === original.bookingUnitId &&
          intervalsOverlap(booking, validated),
      )
      if (conflict) throw new Error('Ese intervalo ya está ocupado. Elige otra hora.')

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                startsAt: madridLocalToUtc(input.date, input.startTime),
                endsAt: madridLocalToUtc(input.date, input.endTime),
              }
            : booking,
        ),
      )
    },
    [bookings, mode, refresh],
  )

  return {
    bookings: bookings.filter((booking) => booking.status === 'confirmed'),
    loading,
    error,
    createBooking,
    cancelBooking,
    rescheduleBooking,
    refresh,
  }
}
