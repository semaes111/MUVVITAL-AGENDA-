import { ArrowRight, CheckCircle2, Clock3, Link2, Stethoscope } from 'lucide-react'

import { BUSINESS_HOURS, formatInMadrid } from '../domain/schedule'
import { useCurrentTime } from '../hooks/useCurrentTime'
import type { Booking, BookingUnit } from '../types'

type RoomStatusCardsProps = {
  bookings: Booking[]
  units: BookingUnit[]
  onReserve: (unit: BookingUnit) => void
}

export function RoomStatusCards({ bookings, units, onReserve }: RoomStatusCardsProps) {
  const now = useCurrentTime()

  return (
    <div className="status-grid">
      {units.map((unit) => {
        const unitBookings = bookings
          .filter((booking) => booking.bookingUnitId === unit.id)
          .toSorted((left, right) => left.startsAt.localeCompare(right.startsAt))
        const current = unitBookings.find(
          (booking) => new Date(booking.startsAt).getTime() <= now && now < new Date(booking.endsAt).getTime(),
        )
        const next = unitBookings.find((booking) => new Date(booking.startsAt).getTime() > now)
        const isSuite = unit.code === 'SUITE_CONSULTA_EXPLORACION'

        return (
          <article className={`status-card status-card-${unit.accent}`} key={unit.id}>
            <div className="status-card-heading">
              <span className="status-icon">
                {isSuite ? <Link2 aria-hidden="true" /> : <Stethoscope aria-hidden="true" />}
              </span>
              <span className={current ? 'status-label status-busy' : 'status-label status-free'}>
                {current ? 'Ocupada ahora' : 'Disponible'}
              </span>
            </div>
            <h2>{unit.shortName}</h2>
            <p className="room-composition">{unit.roomNames.join(' + ')}</p>

            {current ? (
              <div className="occupancy-detail">
                <strong>{current.professionalName}</strong>
                <span>
                  <Clock3 aria-hidden="true" />
                  Hasta las {formatInMadrid(current.endsAt, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <div className="occupancy-detail occupancy-free">
                <strong><CheckCircle2 aria-hidden="true" /> Lista para reservar</strong>
                <span>
                  {next
                    ? `Próxima: ${formatInMadrid(next.startsAt, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : `Sin reservas próximas hasta las ${BUSINESS_HOURS.closesAt}`}
                </span>
              </div>
            )}

            <button className="text-button" onClick={() => onReserve(unit)} type="button">
              Reservar espacio <ArrowRight aria-hidden="true" />
            </button>
          </article>
        )
      })}
    </div>
  )
}
