import { Clock3, Repeat2, UserRound } from 'lucide-react'

import {
  BUSINESS_HOURS,
  dateKeyInMadrid,
  formatInMadrid,
  minutesToTime,
  timeToMinutes,
  timelineMetrics,
} from '../domain/schedule'
import type { Booking, BookingUnit } from '../types'

type DayScheduleProps = {
  bookings: Booking[]
  dateKey: string
  units: BookingUnit[]
  onNewBooking: (unit: BookingUnit, startTime?: string) => void
  onSelectBooking: (booking: Booking) => void
}

export function DaySchedule({
  bookings,
  dateKey,
  units,
  onNewBooking,
  onSelectBooking,
}: DayScheduleProps) {
  const dayBookings = bookings.filter(
    (booking) => dateKeyInMadrid(new Date(booking.startsAt)) === dateKey,
  )
  const openMinutes = timeToMinutes(BUSINESS_HOURS.opensAt)
  const closeMinutes = timeToMinutes(BUSINESS_HOURS.closesAt)
  const hours = Array.from(
    { length: (closeMinutes - openMinutes) / 60 + 1 },
    (_, index) => minutesToTime(openMinutes + index * 60),
  )
  const slots = Array.from(
    { length: (closeMinutes - openMinutes) / 30 },
    (_, index) => minutesToTime(openMinutes + index * 30),
  )

  return (
    <section className="schedule-card" aria-label="Agenda diaria por unidad">
      <div className="desktop-schedule">
        <div className="schedule-head schedule-time-head">Hora</div>
        {units.map((unit) => (
          <div className={`schedule-head schedule-head-${unit.accent}`} key={unit.id}>
            <span>{unit.shortName}</span>
            <small>{unit.roomNames.join(' + ')}</small>
          </div>
        ))}

        <div className="time-axis">
          {hours.map((hour, index) => (
            <span
              className="time-label"
              key={hour}
              style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
            >
              {hour}
            </span>
          ))}
        </div>

        {units.map((unit) => {
          const unitBookings = dayBookings.filter((booking) => booking.bookingUnitId === unit.id)
          return (
            <div className="schedule-column" key={unit.id}>
              <div className="hour-lines" aria-hidden="true">
                {hours.slice(0, -1).map((hour) => <span key={hour} />)}
              </div>
              <div className="slot-layer">
                {slots.map((slot, index) => (
                  <button
                    aria-label={`Reservar ${unit.shortName} a las ${slot}`}
                    className="slot-button"
                    key={slot}
                    onClick={() => onNewBooking(unit, slot)}
                    style={{
                      height: `${100 / slots.length}%`,
                      top: `${(index / slots.length) * 100}%`,
                    }}
                    type="button"
                  />
                ))}
              </div>
              {unitBookings.map((booking) => {
                const metrics = timelineMetrics(booking.startsAt, booking.endsAt)
                return (
                  <button
                    className={`booking-block booking-block-${unit.accent}`}
                    key={booking.id}
                    onClick={() => onSelectBooking(booking)}
                    style={{ top: `${metrics.top}%`, height: `${Math.max(metrics.height, 3.8)}%` }}
                    type="button"
                  >
                    <strong>{booking.professionalName}</strong>
                    <span>
                      {formatInMadrid(booking.startsAt, { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {formatInMadrid(booking.endsAt, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {booking.kind === 'standing_allocation' ? (
                      <small><Repeat2 aria-hidden="true" /> Turno fijo</small>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mobile-schedule">
        {units.map((unit) => {
          const unitBookings = dayBookings
            .filter((booking) => booking.bookingUnitId === unit.id)
            .toSorted((left, right) => left.startsAt.localeCompare(right.startsAt))
          return (
            <section className="mobile-unit" key={unit.id}>
              <div className={`mobile-unit-heading mobile-unit-${unit.accent}`}>
                <div>
                  <strong>{unit.shortName}</strong>
                  <span>{unit.roomNames.join(' + ')}</span>
                </div>
                <button className="button button-small" onClick={() => onNewBooking(unit)} type="button">
                  Reservar
                </button>
              </div>
              {unitBookings.length ? (
                <div className="mobile-booking-list">
                  {unitBookings.map((booking) => (
                    <button
                      className="mobile-booking"
                      key={booking.id}
                      onClick={() => onSelectBooking(booking)}
                      type="button"
                    >
                      <span className="mobile-time">
                        <Clock3 aria-hidden="true" />
                        {formatInMadrid(booking.startsAt, { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {formatInMadrid(booking.endsAt, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <strong><UserRound aria-hidden="true" /> {booking.professionalName}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Sin reservas para este día.</p>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
