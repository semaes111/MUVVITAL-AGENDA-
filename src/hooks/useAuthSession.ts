import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

import type { AgendaBootstrap } from '../types'
import { getConfigurationIssue, supabaseConfiguration } from '../lib/env'
import { loadBootstrap } from '../lib/agenda-service'
import { getSupabaseClient } from '../lib/supabase'

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'denied'; email?: string }
  | { status: 'authorized'; session: Session; bootstrap: AgendaBootstrap }
  | { status: 'error'; message: string }

export function useAuthSession() {
  const [state, setState] = useState<AuthState>(() =>
    supabaseConfiguration ? { status: 'loading' } : { status: 'unauthenticated' },
  )

  const resolveSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ status: 'unauthenticated' })
      return
    }

    try {
      const bootstrap = await loadBootstrap(session.user.id)
      if (!bootstrap) {
        setState({ status: 'denied', email: session.user.email })
        return
      }
      setState({ status: 'authorized', session, bootstrap })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo verificar el acceso',
      })
    }
  }, [])

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) return

    let active = true
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setState({ status: 'error', message: 'No se pudo recuperar la sesión' })
        return
      }
      void resolveSession(data.session)
    })

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (active) void resolveSession(session)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [resolveSession])

  const signInWithGoogle = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) return
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setState({ status: 'error', message: 'No se pudo iniciar sesión con Google' })
  }, [])

  const signOut = useCallback(async () => {
    const client = getSupabaseClient()
    if (client) await client.auth.signOut()
    setState({ status: 'unauthenticated' })
  }, [])

  return {
    state,
    isLiveConfigured: Boolean(supabaseConfiguration),
    configurationIssue: getConfigurationIssue(),
    signInWithGoogle,
    signOut,
  }
}
