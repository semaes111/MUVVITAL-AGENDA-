import { describe, expect, it } from 'vitest'

import {
  BUSINESS_HOURS,
  intervalsOverlap,
  validateBookingWindow,
} from './schedule'

describe('reglas de reserva', () => {
  it('acepta el ejemplo viernes de 15:30 a 18:00', () => {
    const result = validateBookingWindow({
      date: '2026-08-14',
      startTime: '15:30',
      endTime: '18:00',
    })

    expect(result.success).toBe(true)
  })

  it('acepta exactamente el horario operativo de 08:00 a 23:00', () => {
    const result = validateBookingWindow({
      date: '2026-08-14',
      startTime: BUSINESS_HOURS.opensAt,
      endTime: BUSINESS_HOURS.closesAt,
    })

    expect(result.success).toBe(true)
  })

  it.each([
    ['07:45', '09:00', 'La reserva debe comenzar a partir de las 08:00'],
    ['22:30', '23:15', 'La reserva debe finalizar antes de las 23:00'],
    ['10:00', '10:00', 'La hora de fin debe ser posterior a la de inicio'],
    ['10:00', '10:15', 'La duración mínima es de 30 minutos'],
    ['10:07', '11:00', 'Las horas deben ajustarse a bloques de 15 minutos'],
  ])('rechaza %s-%s: %s', (startTime, endTime, message) => {
    const result = validateBookingWindow({
      date: '2026-08-14',
      startTime,
      endTime,
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe(message)
  })

  it('trata los intervalos como [inicio, fin): dos reservas contiguas no chocan', () => {
    expect(
      intervalsOverlap(
        { startsAt: '2026-08-14T15:30:00+02:00', endsAt: '2026-08-14T18:00:00+02:00' },
        { startsAt: '2026-08-14T18:00:00+02:00', endsAt: '2026-08-14T19:00:00+02:00' },
      ),
    ).toBe(false)
  })

  it('detecta un solape real', () => {
    expect(
      intervalsOverlap(
        { startsAt: '2026-08-14T15:30:00+02:00', endsAt: '2026-08-14T18:00:00+02:00' },
        { startsAt: '2026-08-14T17:45:00+02:00', endsAt: '2026-08-14T19:00:00+02:00' },
      ),
    ).toBe(true)
  })
})
