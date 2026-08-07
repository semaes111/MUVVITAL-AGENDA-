import { AlertTriangle, CalendarClock, LoaderCircle, RefreshCw, ShieldX } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppHeader, type AgendaView } from './components/AppHeader'
import {
  BookingDialog,
  type BookingDialogInitial,
} from './components/BookingDialog'
import { DateToolbar } from './components/DateToolbar'
import { DaySchedule } from './components/DaySchedule'
import { FloorPlan } from './components/FloorPlan'
import { LoginScreen } from './components/LoginScreen'
import { RoomStatusCards } from './components/RoomStatusCards'
import { WeekSchedule } from './components/WeekSchedule'
import {
  BUSINESS_HOURS,
  dateKeyInMadrid,
  formatInMadrid,
  longDate,
  nextDefaultEnd,
} from './domain/schedule'
import { useAgenda } from './hooks/useAgenda'
import { useAuthSession } from './hooks/useAuthSession'
import { DEMO_MEMBER, DEMO_UNITS } from './lib/demo-data'
import type { AgendaBootstrap, Booking, CreateBookingInput } from './types'

type DialogState =
  | { open: false }
  | { open: true; initial: BookingDialogInitial; booking?: Booking }

export default function App() {
  const auth = useAuthSession()
  const [demo, setDemo] = useState(false)

  if (demo) {
    return (
      <AgendaApplication
        bootstrap={{ member: DEMO_MEMBER, units: DEMO_UNITS }}
        mode="demo"
        onSignOut={() => setDemo(false)}
      />
    )
  }

  if (auth.state.status === 'loading') return <LoadingScreen />

  if (auth.state.status === 'authorized') {
    return (
      <AgendaApplication
        bootstrap={auth.state.bootstrap}
        mode="live"
        onSignOut={auth.signOut}
      />
    )
  }

  if (auth.state.status === 'denied') {
    return (
      <CenteredMessage
        icon={<ShieldX aria-hidden="true" />}
        title="Cuenta no autorizada"
        message={`${auth.state.email ?? 'Esta cuenta'} ha iniciado sesión correctamente, pero no figura como miembro activo de MÜV Vital.`}
        actionLabel="Usar otra cuenta"
        onAction={() => void auth.signOut()}
      />
    )
  }

  if (auth.state.status === 'error') {
    return (
      <CenteredMessage
        icon={<AlertTriangle aria-hidden="true" />}
        title="No se pudo abrir la agenda"
        message={auth.state.message}
        actionLabel="Volver al acceso"
        onAction={() => void auth.signOut()}
      />
    )
  }

  return (
    <LoginScreen
      configurationIssue={auth.configurationIssue}
      isLiveConfigured={auth.isLiveConfigured}
      onDemo={() => setDemo(true)}
      onGoogleSignIn={auth.signInWithGoogle}
    />
  )
}

type AgendaApplicationProps = {
  bootstrap: AgendaBootstrap
  mode: 'demo' | 'live'
  onSignOut: () => Promise<void> | void
}

function AgendaApplication({ bootstrap, mode, onSignOut }: AgendaApplicationProps) {
  const todayKey = useMemo(() => dateKeyInMadrid(new Date()), [])
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  const [view, setView] = useState<AgendaView>('now')
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const [notice, setNotice] = useState<string | null>(null)
  const agenda = useAgenda({
    mode,
    member: bootstrap.member,
    units: bootstrap.units,
    anchorDateKey: selectedDateKey,
    todayKey,
  })

  const openNewBooking = (
    unit = bootstrap.units[0],
    date = selectedDateKey,
    startTime = '09:00',
  ) => {
    if (!unit) return
    setDialog({
      open: true,
      initial: {
        bookingUnitId: unit.id,
        date,
        startTime,
        endTime: nextDefaultEnd(startTime),
      },
    })
  }

  const openBooking = (booking: Booking) => {
    setDialog({
      open: true,
      booking,
      initial: {
        bookingUnitId: booking.bookingUnitId,
        date: dateKeyInMadrid(new Date(booking.startsAt)),
        startTime: formatInMadrid(booking.startsAt, { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: formatInMadrid(booking.endsAt, { hour: '2-digit', minute: '2-digit', hour12: false }),
      },
    })
  }

  async function createBooking(input: CreateBookingInput) {
    await agenda.createBooking(input)
    setNotice('Reserva confirmada. El espacio ya aparece ocupado para el equipo.')
  }

  async function cancelBooking(bookingId: string) {
    await agenda.cancelBooking(bookingId)
    setNotice('Reserva cancelada y espacios liberados.')
  }

  async function rescheduleBooking(
    bookingId: string,
    input: Omit<CreateBookingInput, 'bookingUnitId'>,
  ) {
    await agenda.rescheduleBooking(bookingId, input)
    setNotice('Horario actualizado.')
  }

  const todayBookings = agenda.bookings.filter(
    (booking) => dateKeyInMadrid(new Date(booking.startsAt)) === todayKey,
  )

  return (
    <div className="app-shell">
      <AppHeader
        member={bootstrap.member}
        mode={mode}
        onNewBooking={() => openNewBooking()}
        onSignOut={onSignOut}
        onViewChange={setView}
        view={view}
      />

      <main className="app-main">
        {notice ? (
          <div className="toast" role="status">
            <span>{notice}</span>
            <button aria-label="Cerrar aviso" onClick={() => setNotice(null)} type="button">×</button>
          </div>
        ) : null}
        {agenda.error ? (
          <div className="alert alert-error app-alert" role="alert">
            <AlertTriangle aria-hidden="true" />
            <span>{agenda.error}</span>
            <button className="button button-small" onClick={() => void agenda.refresh()} type="button">
              <RefreshCw aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : null}

        {view === 'now' ? (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">Visión operativa</span>
                <h1>Hola, {bootstrap.member.displayName.split(' ')[0]}</h1>
                <p>{longDate(todayKey)} · Horario {BUSINESS_HOURS.opensAt}–{BUSINESS_HOURS.closesAt}</p>
              </div>
              <div className="today-count">
                <CalendarClock aria-hidden="true" />
                <div><strong>{todayBookings.length}</strong><span>reservas hoy</span></div>
              </div>
            </div>
            <RoomStatusCards bookings={agenda.bookings} onReserve={openNewBooking} units={bootstrap.units} />
            <FloorPlan bookings={agenda.bookings} onReserve={openNewBooking} units={bootstrap.units} />
          </>
        ) : null}

        {view === 'day' ? (
          <>
            <DateToolbar dateKey={selectedDateKey} mode="day" onChange={setSelectedDateKey} todayKey={todayKey} />
            {agenda.loading ? <InlineLoading /> : (
              <DaySchedule
                bookings={agenda.bookings}
                dateKey={selectedDateKey}
                onNewBooking={(unit, startTime) => openNewBooking(unit, selectedDateKey, startTime)}
                onSelectBooking={openBooking}
                units={bootstrap.units}
              />
            )}
          </>
        ) : null}

        {view === 'week' ? (
          <>
            <DateToolbar dateKey={selectedDateKey} mode="week" onChange={setSelectedDateKey} todayKey={todayKey} />
            {agenda.loading ? <InlineLoading /> : (
              <WeekSchedule
                bookings={agenda.bookings}
                dateKey={selectedDateKey}
                onNewBooking={(unit, date) => openNewBooking(unit, date)}
                onSelectBooking={openBooking}
                units={bootstrap.units}
              />
            )}
          </>
        ) : null}

        {view === 'plan' ? (
          <>
            <div className="page-heading compact-heading">
              <div>
                <span className="eyebrow">Plano operativo</span>
                <h1>Espacios MÜV Vital</h1>
                <p>Cuatro estancias visibles; dos unidades disponibles para reserva.</p>
              </div>
            </div>
            <FloorPlan bookings={agenda.bookings} onReserve={openNewBooking} units={bootstrap.units} />
          </>
        ) : null}
      </main>

      {dialog.open ? (
        <BookingDialog
          booking={dialog.booking}
          initial={dialog.initial}
          key={dialog.booking?.id ?? `${dialog.initial.bookingUnitId}:${dialog.initial.date}:${dialog.initial.startTime}`}
          member={bootstrap.member}
          onCancelBooking={cancelBooking}
          onClose={() => setDialog({ open: false })}
          onCreate={createBooking}
          onReschedule={rescheduleBooking}
          todayKey={todayKey}
          units={bootstrap.units}
        />
      ) : null}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <LoaderCircle aria-hidden="true" />
      <span>Comprobando acceso…</span>
    </div>
  )
}

function InlineLoading() {
  return (
    <div className="inline-loading">
      <LoaderCircle aria-hidden="true" />
      <span>Cargando agenda…</span>
    </div>
  )
}

type CenteredMessageProps = {
  icon: React.ReactNode
  title: string
  message: string
  actionLabel: string
  onAction: () => void
}

function CenteredMessage({ icon, title, message, actionLabel, onAction }: CenteredMessageProps) {
  return (
    <main className="centered-message">
      <div className="message-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{message}</p>
      <button className="button button-primary" onClick={onAction} type="button">{actionLabel}</button>
    </main>
  )
}
