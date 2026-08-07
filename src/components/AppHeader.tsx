import {
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  LogOut,
  Map,
  Plus,
} from 'lucide-react'

import type { Member } from '../types'
import { Logo } from './Logo'

export type AgendaView = 'now' | 'day' | 'week' | 'plan'

type AppHeaderProps = {
  member: Member
  mode: 'demo' | 'live'
  view: AgendaView
  onViewChange: (view: AgendaView) => void
  onNewBooking: () => void
  onSignOut: () => Promise<void> | void
}

const NAV_ITEMS: Array<{ id: AgendaView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'now', label: 'Ahora', icon: LayoutDashboard },
  { id: 'day', label: 'Día', icon: CalendarDays },
  { id: 'week', label: 'Semana', icon: CalendarRange },
  { id: 'plan', label: 'Espacios', icon: Map },
]

export function AppHeader({
  member,
  mode,
  view,
  onViewChange,
  onNewBooking,
  onSignOut,
}: AppHeaderProps) {
  const initials = member.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="app-header">
      <div className="header-topline">
        <div className="app-brand">
          <Logo className="app-seal" compact />
          <div>
            <span>MÜV Vital</span>
            <small>Agenda de espacios</small>
          </div>
        </div>

        <div className="header-actions">
          {mode === 'demo' ? <span className="demo-badge">Demostración</span> : null}
          <button className="button button-accent" onClick={onNewBooking} type="button">
            <Plus aria-hidden="true" />
            <span>Nueva reserva</span>
          </button>
          <div className="user-block">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <div>
              <strong>{member.displayName}</strong>
              <small>{member.role === 'coordinator' ? 'Coordinación' : 'Profesional'}</small>
            </div>
          </div>
          <button
            aria-label={mode === 'demo' ? 'Cerrar demostración' : 'Cerrar sesión'}
            className="icon-button icon-button-on-dark"
            onClick={() => void onSignOut()}
            title={mode === 'demo' ? 'Cerrar demostración' : 'Cerrar sesión'}
            type="button"
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </div>

      <nav className="app-nav" aria-label="Vistas de la agenda">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            aria-current={view === id ? 'page' : undefined}
            className={view === id ? 'nav-item nav-item-active' : 'nav-item'}
            key={id}
            onClick={() => onViewChange(id)}
            type="button"
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
