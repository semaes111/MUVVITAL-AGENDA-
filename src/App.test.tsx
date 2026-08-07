import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('MÜV Vital Agenda', () => {
  it('permite explorar la aplicación sin conectar ni escribir en Supabase', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Tu espacio, cuando lo necesitas.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Abrir demostración/i }))

    expect(screen.getByRole('heading', { name: /Hola, Profesional/i })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Consulta + Exploración' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Podología' })).toBeVisible()
  })

  it('crea una reserva válida en demostración y muestra confirmación', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Abrir demostración/i }))
    await user.click(screen.getByRole('button', { name: /Nueva reserva/i }))

    expect(screen.getByRole('dialog', { name: 'Reserva un espacio' })).toBeVisible()
    await user.selectOptions(screen.getByLabelText(/Inicio/i), '13:00')
    await user.selectOptions(screen.getByLabelText(/Fin/i), '14:00')
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    expect(
      await screen.findByText('Reserva confirmada. El espacio ya aparece ocupado para el equipo.'),
    ).toBeVisible()
  })
})
