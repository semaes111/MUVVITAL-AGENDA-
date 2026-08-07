import { Plus } from 'lucide-react'
import { useState } from 'react'

import {
  dateKeyInMadrid,
  dateKeysFrom,
  formatInMadrid,
  startOfWeekKey,
} from '../domain/schedule'
import type { Booking, BookingUnit } from '../types'

type WeekScheduleProps = {
  bookings: Booking[]
  dateKey: string
  units: BookingUnit[]
  onNewBooking: (unit: BookingUnit, dateKey: string) => void
  onSelectBooking: (booking: Booking) => void
}

export function WeekSchedule({
  bookings,
  dateKey,
  units,
  onNewBooking,
  onSelectBooking,
}: WeekScheduleProps) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? '')
  const unit = units.find((candidate) => candidate.id === unitId) ?? units[0]
  if (!unit) return null
  const days = dateKeysFrom(startOfWeekKey(dateKey), 7)

  return (
    <section className="week-card" aria-label="Agenda semanal">
      <div className="week-filter">
        <label htmlFor="week-unit">Espacio</label>
        <select id="week-unit" onChange={(event) => setUnitId(event.target.value)} value={unit.id}>
          {units.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.shortName}</option>
          ))}
        </select>
        <p>Una unidad por vista para evitar confundir salas físicas con recursos reservables.</p>
      </div>

      <div className="week-grid">
        {days.map((day) => {
          const dayBookings = bookings
            .filter(
              (booking) =>
                booking.bookingUnitId === unit.id &&
                dateKeyInMadrid(new Date(booking.startsAt)) === day,
            )
            .toSorted((left, right) => left.startsAt.localeCompare(right.startsAt))
          return (
            <article className="week-day" key={day}>
              <div className="week-day-heading">
                <span>{formatDay(day, 'weekday')}</span>
                <strong>{formatDay(day, 'day')}</strong>
              </div>
              <div className="week-day-bookings">
                {dayBookings.map((booking) => (
                  <button
                    className={`week-booking week-booking-${unit.accent}`}
                    key={booking.id}
                    onClick={() => onSelectBooking(booking)}
                    type="button"
                  >
                    <span>
                      {formatInMadrid(booking.startsAt, { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {formatInMadrid(booking.endsAt, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <strong>{booking.professionalName}</strong>
                  </button>
                ))}
                <button className="week-add" onClick={() => onNewBooking(unit, day)} type="button">
                  <Plus aria-hidden="true" /> Añadir
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function formatDay(dateKey: string, part: 'weekday' | 'day') {
  const date = new Date(`${dateKey}T12:00:00Z`)
  if (part === 'weekday') {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', '')
  }
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    .format(date)
}
