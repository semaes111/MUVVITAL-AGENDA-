import { CalendarDays, Clock3, Info, Link2, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import {
  BUSINESS_HOURS,
  dateKeyInMadrid,
  formatInMadrid,
  nextDefaultEnd,
  timeOptions,
  timeToMinutes,
  validateBookingWindow,
} from '../domain/schedule'
import type { Booking, BookingUnit, CreateBookingInput, Member } from '../types'

export type BookingDialogInitial = {
  bookingUnitId: string
  date: string
  startTime: string
  endTime: string
}

type BookingDialogProps = {
  booking?: Booking
  initial: BookingDialogInitial
  member: Member
  todayKey: string
  units: BookingUnit[]
  onClose: () => void
  onCreate: (input: CreateBookingInput) => Promise<void>
  onReschedule: (
    bookingId: string,
    input: Omit<CreateBookingInput, 'bookingUnitId'>,
  ) => Promise<void>
  onCancelBooking: (bookingId: string) => Promise<void>
}

export function BookingDialog({
  booking,
  initial,
  member,
  todayKey,
  units,
  onClose,
  onCreate,
  onReschedule,
  onCancelBooking,
}: BookingDialogProps) {
  const [bookingUnitId, setBookingUnitId] = useState(initial.bookingUnitId)
  const [date, setDate] = useState(
    booking ? dateKeyInMadrid(new Date(booking.startsAt)) : initial.date,
  )
  const [startTime, setStartTime] = useState(
    booking
      ? formatInMadrid(booking.startsAt, { hour: '2-digit', minute: '2-digit', hour12: false })
      : initial.startTime,
  )
  const [endTime, setEndTime] = useState(
    booking
      ? formatInMadrid(booking.endsAt, { hour: '2-digit', minute: '2-digit', hour12: false })
      : initial.endTime,
  )
  const [saving, setSaving] = useState(false)
  const [confirmingCancellation, setConfirmingCancellation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unit = units.find((candidate) => candidate.id === bookingUnitId)
  const canManage = !booking || booking.canManage || member.role !== 'professional'
  const options = timeOptions()
  const endOptions = options.filter(
    (time) => timeToMinutes(time) >= timeToMinutes(startTime) + BUSINESS_HOURS.minimumDurationMinutes,
  )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canManage) return
    const validated = validateBookingWindow({ date, startTime, endTime })
    if (!validated.success) {
      setError(validated.error)
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (booking) {
        await onReschedule(booking.id, { date, startTime, endTime })
      } else {
        await onCreate({ bookingUnitId, date, startTime, endTime })
      }
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la reserva')
    } finally {
      setSaving(false)
    }
  }

  async function cancelBooking() {
    if (!booking || !canManage) return
    setSaving(true)
    setError(null)
    try {
      await onCancelBooking(booking.id)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cancelar la reserva')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        aria-labelledby="booking-dialog-title"
        aria-modal="true"
        className="booking-dialog"
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{booking ? 'Detalle de reserva' : 'Nueva reserva'}</span>
            <h2 id="booking-dialog-title">
              {booking ? booking.bookingUnitName : 'Reserva un espacio'}
            </h2>
          </div>
          <button aria-label="Cerrar" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        {booking ? (
          <div className="booking-owner">
            <span className="avatar avatar-light" aria-hidden="true">
              {booking.professionalName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{booking.professionalName}</strong>
              <span>{booking.kind === 'standing_allocation' ? 'Turno fijo recurrente' : 'Reserva puntual'}</span>
            </div>
          </div>
        ) : null}

        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving || !canManage}>
            {!booking ? (
              <label className="field field-full">
                <span>Unidad reservable</span>
                <select onChange={(event) => setBookingUnitId(event.target.value)} value={bookingUnitId}>
                  {units.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {unit?.code === 'SUITE_CONSULTA_EXPLORACION' ? (
              <div className="compound-notice">
                <Link2 aria-hidden="true" />
                <span><strong>Reserva conjunta.</strong> Consulta y Exploración quedarán ocupadas durante todo el intervalo.</span>
              </div>
            ) : null}

            <div className="field-grid">
              <label className="field field-full">
                <span><CalendarDays aria-hidden="true" /> Fecha</span>
                <input min={todayKey} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
              </label>
              <label className="field">
                <span><Clock3 aria-hidden="true" /> Inicio</span>
                <select
                  onChange={(event) => {
                    const nextStartTime = event.target.value
                    setStartTime(nextStartTime)
                    if (
                      timeToMinutes(endTime) <
                      timeToMinutes(nextStartTime) + BUSINESS_HOURS.minimumDurationMinutes
                    ) {
                      setEndTime(nextDefaultEnd(nextStartTime))
                    }
                  }}
                  value={startTime}
                >
                  {options.slice(0, -2).map((time) => <option key={time}>{time}</option>)}
                </select>
              </label>
              <label className="field">
                <span><Clock3 aria-hidden="true" /> Fin</span>
                <select
                  onChange={(event) => setEndTime(event.target.value)}
                  value={endOptions.includes(endTime) ? endTime : endOptions[0]}
                >
                  {endOptions.map((time) => <option key={time}>{time}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          {!canManage ? (
            <div className="alert alert-info"><Info aria-hidden="true" /> Solo el titular o coordinación puede modificar esta reserva.</div>
          ) : null}
          {error ? <div className="alert alert-error" role="alert">{error}</div> : null}

          <div className="dialog-actions">
            {booking && canManage ? (
              confirmingCancellation ? (
                <div className="cancel-confirmation">
                  <span>¿Cancelar esta reserva?</span>
                  <button className="button button-danger" disabled={saving} onClick={() => void cancelBooking()} type="button">
                    Sí, cancelar
                  </button>
                  <button className="button button-quiet" onClick={() => setConfirmingCancellation(false)} type="button">
                    Volver
                  </button>
                </div>
              ) : (
                <button className="button button-danger-quiet" onClick={() => setConfirmingCancellation(true)} type="button">
                  <Trash2 aria-hidden="true" /> Cancelar reserva
                </button>
              )
            ) : <span />}
            <div className="dialog-primary-actions">
              <button className="button button-quiet" onClick={onClose} type="button">Cerrar</button>
              {canManage && !confirmingCancellation ? (
                <button className="button button-primary" disabled={saving} type="submit">
                  {saving ? 'Guardando…' : booking ? 'Guardar cambios' : 'Confirmar reserva'}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
