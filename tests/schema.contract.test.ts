import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260807010418_init_agenda.sql'),
  'utf8',
)

describe('contrato de seguridad y concurrencia del esquema', () => {
  it('mantiene las tablas aisladas mediante el prefijo agenda_', () => {
    const createdTables = [...sql.matchAll(/create table public\.([a-z_]+)/g)].map((match) => match[1])

    expect(createdTables.length).toBeGreaterThanOrEqual(12)
    expect(createdTables.every((name) => name.startsWith('agenda_'))).toBe(true)
  })

  it('fija el horario operativo 08:00-23:00 con parámetros configurables', () => {
    expect(sql).toContain("opens_at time not null default '08:00'")
    expect(sql).toContain("closes_at time not null default '23:00'")
    expect(sql).toContain('slot_minutes smallint not null default 15')
  })

  it('impide solapes por sala física mediante exclusión GiST e intervalo [inicio, fin)', () => {
    expect(sql).toContain("tstzrange(starts_at, ends_at, '[)')")
    expect(sql).toMatch(/exclude using gist[\s\S]+room_id with =[\s\S]+period with &&/)
    expect(sql).toContain("where (status = 'confirmed')")
  })

  it('activa RLS en todas las tablas y no crea políticas abiertas', () => {
    const createdTableCount = [...sql.matchAll(/create table public\.agenda_/g)].length
    const rlsCount = [...sql.matchAll(/alter table public\.agenda_[a-z_]+ enable row level security;/g)].length

    expect(rlsCount).toBe(createdTableCount)
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i)
  })

  it('mantiene las funciones privilegiadas fuera del esquema expuesto', () => {
    expect(sql).toContain('create schema if not exists muvvital_agenda_private')
    expect(sql).toContain('security definer')
    expect(sql).toMatch(/create or replace function public\.agenda_create_booking[\s\S]+security invoker/)
    expect(sql).not.toMatch(/create or replace function public\.[^(]+[\s\S]{0,220}security definer/)
  })

  it('usa cancelación lógica y no borra reservas', () => {
    expect(sql).toContain("set status = 'cancelled'")
    expect(sql).not.toMatch(/delete\s+from\s+public\.agenda_bookings/i)
  })

  it('no incluye secretos ni campos de pacientes', () => {
    expect(sql).not.toMatch(/sb_secret_[a-z0-9]+|eyJ[a-zA-Z0-9_-]{20,}|refresh_token\s*=/i)
    expect(sql).not.toMatch(/patient|paciente|diagn[oó]stico|tel[eé]fono/i)
  })
})
