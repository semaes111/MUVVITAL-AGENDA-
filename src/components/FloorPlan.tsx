import { Info, Link2, Lock, Plus } from 'lucide-react'

import { useCurrentTime } from '../hooks/useCurrentTime'
import type { Booking, BookingUnit } from '../types'

type FloorPlanProps = {
  bookings: Booking[]
  units: BookingUnit[]
  onReserve: (unit: BookingUnit) => void
}

export function FloorPlan({ bookings, units, onReserve }: FloorPlanProps) {
  const now = useCurrentTime()
  const suite = units.find((unit) => unit.code === 'SUITE_CONSULTA_EXPLORACION')
  const podiatry = units.find((unit) => unit.code === 'PODOLOGIA')
  const suiteBooking = currentBooking(bookings, suite?.id, now)
  const podiatryBooking = currentBooking(bookings, podiatry?.id, now)

  return (
    <section className="floorplan-card" aria-labelledby="floorplan-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Distribución clínica</span>
          <h2 id="floorplan-title">Estado de los espacios</h2>
          <p>Consulta y Exploración funcionan como una única unidad indivisible.</p>
        </div>
        <span className="live-indicator"><span /> Estado actual</span>
      </div>

      <div className="floorplan-layout">
        <div className="floorplan-canvas">
          <svg
            aria-label="Plano esquemático de Consulta, Exploración, Podología y Entrenamiento personal"
            className="floorplan-svg"
            role="img"
            viewBox="0 0 760 470"
          >
            <defs>
              <pattern height="12" id="neutralPattern" patternUnits="userSpaceOnUse" width="12">
                <path d="M-3 3L3-3M0 12L12 0M9 15L15 9" stroke="#97A5B9" strokeOpacity=".22" strokeWidth="2" />
              </pattern>
              <pattern height="10" id="suitePattern" patternUnits="userSpaceOnUse" width="10">
                <path d="M0 10L10 0" stroke="#244C5D" strokeOpacity=".12" strokeWidth="2" />
              </pattern>
            </defs>

            <rect fill="#F8F7F5" height="430" rx="24" stroke="#D8D4D7" strokeWidth="2" width="720" x="20" y="20" />
            <rect fill="#FFFFFF" height="116" rx="14" stroke="#D8D4D7" width="250" x="44" y="44" />
            <text className="plan-small" x="68" y="82">RECEPCIÓN Y ESPERA</text>
            <path d="M70 112h150" stroke="#D8D4D7" strokeLinecap="round" strokeWidth="12" />

            <rect fill="url(#neutralPattern)" height="116" rx="14" stroke="#97A5B9" width="398" x="318" y="44" />
            <text className="plan-small" x="342" y="82">ZONA GENERAL DE ENTRENAMIENTO</text>
            <text className="plan-meta" x="342" y="112">Contexto · no reservable desde esta agenda</text>

            <path d="M44 186h672" stroke="#D8D4D7" strokeDasharray="7 10" strokeWidth="2" />
            <text className="plan-small" x="52" y="211">ÁREA CLÍNICA</text>

            <RoomShape
              accent="suite"
              bookingName={suiteBooking?.professionalName}
              label="CONSULTA"
              occupied={Boolean(suiteBooking)}
              surface="8,70 m²"
              x={44}
              y={230}
            />
            <RoomShape
              accent="suite"
              bookingName={suiteBooking?.professionalName}
              label="EXPLORACIÓN"
              occupied={Boolean(suiteBooking)}
              surface="9,12 m²"
              x={274}
              y={230}
            />
            <path d="M254 292h38" stroke="#244C5D" strokeWidth="5" />
            <circle cx="254" cy="292" fill="#244C5D" r="7" />
            <circle cx="292" cy="292" fill="#244C5D" r="7" />

            <RoomShape
              accent="ocean"
              bookingName={podiatryBooking?.professionalName}
              label="PODOLOGÍA"
              occupied={Boolean(podiatryBooking)}
              surface="8,70 m²"
              x={504}
              y={230}
            />

            <rect fill="url(#neutralPattern)" height="68" rx="12" stroke="#97A5B9" width="672" x="44" y="368" />
            <text className="plan-small" x="68" y="397">ENTRENAMIENTO PERSONAL · 11,29 m²</text>
            <text className="plan-meta" x="68" y="421">Visible como contexto · no reservable</text>
          </svg>
        </div>

        <aside className="floorplan-legend" aria-label="Unidades de reserva">
          <div className="legend-item legend-suite">
            <span className="legend-icon"><Link2 aria-hidden="true" /></span>
            <div>
              <strong>Suite Consulta + Exploración</strong>
              <p>Las dos salas se bloquean y liberan juntas.</p>
              {suite ? (
                <button className="text-button" onClick={() => onReserve(suite)} type="button">
                  <Plus aria-hidden="true" /> Reservar suite
                </button>
              ) : null}
            </div>
          </div>
          <div className="legend-item legend-ocean">
            <span className="legend-icon"><span className="podiatry-mark">P</span></span>
            <div>
              <strong>Podología</strong>
              <p>Unidad independiente con acceso a la sala anexa.</p>
              {podiatry ? (
                <button className="text-button" onClick={() => onReserve(podiatry)} type="button">
                  <Plus aria-hidden="true" /> Reservar podología
                </button>
              ) : null}
            </div>
          </div>
          <div className="legend-item legend-neutral">
            <span className="legend-icon"><Lock aria-hidden="true" /></span>
            <div>
              <strong>Entrenamiento personal</strong>
              <p>No participa en disponibilidad ni conflictos.</p>
            </div>
          </div>
          <div className="floorplan-note">
            <Info aria-hidden="true" />
            <p>El plano es operativo y esquemático; el PDF técnico sigue siendo la referencia dimensional.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function currentBooking(bookings: Booking[], unitId: string | undefined, now: number) {
  return bookings.find(
    (booking) =>
      booking.bookingUnitId === unitId &&
      new Date(booking.startsAt).getTime() <= now &&
      now < new Date(booking.endsAt).getTime(),
  )
}

type RoomShapeProps = {
  x: number
  y: number
  label: string
  surface: string
  occupied: boolean
  bookingName?: string
  accent: 'suite' | 'ocean'
}

function RoomShape({ x, y, label, surface, occupied, bookingName, accent }: RoomShapeProps) {
  const fill = accent === 'suite' ? 'url(#suitePattern)' : '#D9EEEE'
  const stroke = accent === 'suite' ? '#244C5D' : '#6BB0B1'
  return (
    <g>
      <rect fill={fill} height="116" rx="14" stroke={stroke} strokeWidth="3" width="212" x={x} y={y} />
      <circle cx={x + 178} cy={y + 30} fill={occupied ? '#E87928' : '#2F806E'} r="7" />
      <text className="plan-room" x={x + 18} y={y + 38}>{label}</text>
      <text className="plan-meta" x={x + 18} y={y + 65}>{surface}</text>
      <text className="plan-state" x={x + 18} y={y + 94}>
        {occupied ? bookingName : 'Disponible'}
      </text>
    </g>
  )
}
