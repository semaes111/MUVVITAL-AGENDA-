import { z } from 'zod'

export const BUSINESS_HOURS = Object.freeze({
  opensAt: '08:00',
  closesAt: '23:00',
  slotMinutes: 15,
  minimumDurationMinutes: 30,
  maximumDurationMinutes: 15 * 60,
  timeZone: 'Europe/Madrid',
})

export type BookingWindowInput = {
  date: string
  startTime: string
  endTime: string
}

export type ValidationResult =
  | { success: true; startsAt: string; endsAt: string; durationMinutes: number }
  | { success: false; error: string }

type Interval = {
  startsAt: string
  endsAt: string
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/

const bookingWindowSchema = z.object({
  date: z.string().regex(datePattern),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
})

export function timeToMinutes(time: string): number {
  const match = time.match(timePattern)
  if (!match) return Number.NaN
  return Number(match[1]) * 60 + Number(match[2])
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60, totalMinutes))
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function validateBookingWindow(input: BookingWindowInput): ValidationResult {
  const parsed = bookingWindowSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'La fecha y las horas no tienen un formato válido' }
  }

  const startMinutes = timeToMinutes(parsed.data.startTime)
  const endMinutes = timeToMinutes(parsed.data.endTime)
  const opensAt = timeToMinutes(BUSINESS_HOURS.opensAt)
  const closesAt = timeToMinutes(BUSINESS_HOURS.closesAt)

  if (startMinutes < opensAt) {
    return {
      success: false,
      error: `La reserva debe comenzar a partir de las ${BUSINESS_HOURS.opensAt}`,
    }
  }

  if (endMinutes > closesAt) {
    return {
      success: false,
      error: `La reserva debe finalizar antes de las ${BUSINESS_HOURS.closesAt}`,
    }
  }

  if (endMinutes <= startMinutes) {
    return { success: false, error: 'La hora de fin debe ser posterior a la de inicio' }
  }

  if (
    startMinutes % BUSINESS_HOURS.slotMinutes !== 0 ||
    endMinutes % BUSINESS_HOURS.slotMinutes !== 0
  ) {
    return {
      success: false,
      error: `Las horas deben ajustarse a bloques de ${BUSINESS_HOURS.slotMinutes} minutos`,
    }
  }

  const durationMinutes = endMinutes - startMinutes
  if (durationMinutes < BUSINESS_HOURS.minimumDurationMinutes) {
    return {
      success: false,
      error: `La duración mínima es de ${BUSINESS_HOURS.minimumDurationMinutes} minutos`,
    }
  }

  if (durationMinutes > BUSINESS_HOURS.maximumDurationMinutes) {
    return {
      success: false,
      error: `La duración máxima es de ${BUSINESS_HOURS.maximumDurationMinutes / 60} horas`,
    }
  }

  return {
    success: true,
    startsAt: madridLocalToUtc(parsed.data.date, parsed.data.startTime),
    endsAt: madridLocalToUtc(parsed.data.date, parsed.data.endTime),
    durationMinutes,
  }
}

export function intervalsOverlap(left: Interval, right: Interval): boolean {
  const leftStart = new Date(left.startsAt).getTime()
  const leftEnd = new Date(left.endsAt).getTime()
  const rightStart = new Date(right.startsAt).getTime()
  const rightEnd = new Date(right.endsAt).getTime()
  return leftStart < rightEnd && rightStart < leftEnd
}

export function madridLocalToUtc(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = wallClockAsUtc

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const offset = getTimeZoneOffsetMilliseconds(new Date(candidate), BUSINESS_HOURS.timeZone)
    candidate = wallClockAsUtc - offset
  }

  return new Date(candidate).toISOString()
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )

  return representedAsUtc - date.getTime()
}

export function formatInMadrid(
  isoDate: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('es-ES', {
    ...options,
    timeZone: BUSINESS_HOURS.timeZone,
  }).format(new Date(isoDate))
}

export function dateKeyInMadrid(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_HOURS.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function startOfWeekKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = date.getUTCDay()
  const distanceFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  return shiftDateKey(dateKey, -distanceFromMonday)
}

export function dateKeysFrom(startDateKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftDateKey(startDateKey, index))
}

export function timeOptions(): string[] {
  const options: string[] = []
  const opensAt = timeToMinutes(BUSINESS_HOURS.opensAt)
  const closesAt = timeToMinutes(BUSINESS_HOURS.closesAt)
  for (let minute = opensAt; minute <= closesAt; minute += BUSINESS_HOURS.slotMinutes) {
    options.push(minutesToTime(minute))
  }
  return options
}

export function timelineMetrics(startsAt: string, endsAt: string) {
  const startTime = formatInMadrid(startsAt, { hour: '2-digit', minute: '2-digit', hour12: false })
  const endTime = formatInMadrid(endsAt, { hour: '2-digit', minute: '2-digit', hour12: false })
  const opensAt = timeToMinutes(BUSINESS_HOURS.opensAt)
  const total = timeToMinutes(BUSINESS_HOURS.closesAt) - opensAt
  const top = ((timeToMinutes(startTime) - opensAt) / total) * 100
  const height = ((timeToMinutes(endTime) - timeToMinutes(startTime)) / total) * 100
  return { top, height }
}

export function nextDefaultEnd(startTime: string): string {
  return minutesToTime(
    Math.min(
      timeToMinutes(BUSINESS_HOURS.closesAt),
      timeToMinutes(startTime) + 60,
    ),
  )
}

export function longDate(dateKey: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T12:00:00Z`))
}
