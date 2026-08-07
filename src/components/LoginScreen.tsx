import { ArrowRight, CalendarDays, Clock3, LockKeyhole, MapPinned } from 'lucide-react'

import { BUSINESS_HOURS } from '../domain/schedule'
import { EXPECTED_SUPABASE_URL } from '../lib/env'
import { Logo } from './Logo'

type LoginScreenProps = {
  isLiveConfigured: boolean
  configurationIssue: string | null
  onGoogleSignIn: () => Promise<void>
  onDemo: () => void
}

export function LoginScreen({
  isLiveConfigured,
  configurationIssue,
  onGoogleSignIn,
  onDemo,
}: LoginScreenProps) {
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <Logo className="login-logo" />
          <span className="eyebrow">Agenda interna</span>
          <h1 id="login-title">Tu espacio, cuando lo necesitas.</h1>
          <p>
            Reserva Consulta + Exploración o Podología y deja la ocupación visible para todo
            el equipo.
          </p>

          <div className="login-features" aria-label="Características principales">
            <div>
              <Clock3 aria-hidden="true" />
              <span>{BUSINESS_HOURS.opensAt} — {BUSINESS_HOURS.closesAt}</span>
            </div>
            <div>
              <MapPinned aria-hidden="true" />
              <span>Dos unidades reservables</span>
            </div>
            <div>
              <CalendarDays aria-hidden="true" />
              <span>Calendario compartido</span>
            </div>
          </div>
        </div>

        <div className="login-actions">
          <div className="secure-pill">
            <LockKeyhole aria-hidden="true" />
            Acceso exclusivo para profesionales autorizados
          </div>

          {configurationIssue ? <p className="alert alert-error">{configurationIssue}</p> : null}

          <button
            className="button button-primary button-large"
            disabled={!isLiveConfigured}
            onClick={() => void onGoogleSignIn()}
            type="button"
          >
            <GoogleMark />
            Continuar con Google
          </button>

          {!isLiveConfigured ? (
            <p className="form-help">
              El acceso real se activará al configurar la clave publicable del proyecto
              autorizado <code>{new URL(EXPECTED_SUPABASE_URL).hostname.split('.')[0]}</code>.
            </p>
          ) : null}

          <div className="divider"><span>Vista previa segura</span></div>

          <button className="button button-secondary button-large" onClick={onDemo} type="button">
            Abrir demostración
            <ArrowRight aria-hidden="true" />
          </button>
          <p className="form-help">La demostración usa datos ficticios y no escribe en Supabase.</p>
        </div>
      </section>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.39 13.86A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z" fill="#FBBC05" />
      <path d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" fill="#EA4335" />
    </svg>
  )
}
