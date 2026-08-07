import { ChevronLeft, ChevronRight } from 'lucide-react'

import { BUSINESS_HOURS, longDate, shiftDateKey, startOfWeekKey } from '../domain/schedule'

type DateToolbarProps = {
  dateKey: string
  mode: 'day' | 'week'
  onChange: (dateKey: string) => void
  todayKey: string
}

export function DateToolbar({ dateKey, mode, onChange, todayKey }: DateToolbarProps) {
  const step = mode === 'week' ? 7 : 1
  const title = mode === 'week' ? weekTitle(dateKey) : longDate(dateKey)

  return (
    <div className="date-toolbar">
      <div>
        <span className="eyebrow">{mode === 'week' ? 'Vista semanal' : 'Vista diaria'}</span>
        <h1>{title}</h1>
        <p>Horario {BUSINESS_HOURS.opensAt}–{BUSINESS_HOURS.closesAt} · {BUSINESS_HOURS.timeZone}</p>
      </div>
      <div className="date-controls">
        <button className="button button-quiet" onClick={() => onChange(todayKey)} type="button">
          Hoy
        </button>
        <button
          aria-label={mode === 'week' ? 'Semana anterior' : 'Día anterior'}
          className="icon-button"
          onClick={() => onChange(shiftDateKey(dateKey, -step))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          aria-label={mode === 'week' ? 'Semana siguiente' : 'Día siguiente'}
          className="icon-button"
          onClick={() => onChange(shiftDateKey(dateKey, step))}
          type="button"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function weekTitle(dateKey: string): string {
  const monday = startOfWeekKey(dateKey)
  const sunday = shiftDateKey(monday, 6)
  const start = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${monday}T12:00:00Z`))
  const end = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${sunday}T12:00:00Z`))
  return `${start} — ${end}`
}
