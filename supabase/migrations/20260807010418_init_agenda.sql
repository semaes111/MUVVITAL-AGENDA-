-- MÜV Vital Agenda
-- Prepared for the existing project cumkjqkknicjrnvwejgk.
-- This file is versioned only. It must not be applied before a read-only audit
-- confirms that the target project is compatible and the owner authorizes it.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists muvvital_agenda_private;
revoke all on schema muvvital_agenda_private from public, anon, authenticated;

create table public.agenda_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'Europe/Madrid',
  opens_at time not null default '08:00',
  closes_at time not null default '23:00',
  slot_minutes smallint not null default 15,
  minimum_duration_minutes smallint not null default 30,
  maximum_duration_minutes smallint not null default 900,
  morning_starts_at time not null default '08:00',
  morning_ends_at time not null default '14:00',
  afternoon_starts_at time not null default '14:00',
  afternoon_ends_at time not null default '23:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_organizations_name_length check (char_length(name) between 2 and 120),
  constraint agenda_organizations_hours_order check (closes_at > opens_at),
  constraint agenda_organizations_slot_minutes check (slot_minutes in (5, 10, 15, 20, 30, 60)),
  constraint agenda_organizations_duration_order check (
    minimum_duration_minutes >= slot_minutes
    and maximum_duration_minutes >= minimum_duration_minutes
  ),
  constraint agenda_organizations_periods check (
    morning_starts_at >= opens_at
    and morning_ends_at > morning_starts_at
    and afternoon_starts_at >= morning_ends_at
    and afternoon_ends_at <= closes_at
  )
);

comment on column public.agenda_organizations.morning_ends_at is
  'Initial configurable boundary; 14:00 is provisional until the owner confirms the guarantee periods.';

create table public.agenda_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  code text not null,
  name text not null,
  room_type text not null check (room_type in ('clinical', 'training', 'support')),
  surface_m2 numeric(6, 2),
  svg_key text not null,
  is_reservable boolean not null default true,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, svg_key),
  unique (id, organization_id),
  constraint agenda_rooms_surface_positive check (surface_m2 is null or surface_m2 > 0)
);

create table public.agenda_booking_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint agenda_booking_units_name_length check (char_length(name) between 2 and 120)
);

create table public.agenda_booking_unit_rooms (
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  booking_unit_id uuid not null,
  room_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (booking_unit_id, room_id),
  foreign key (booking_unit_id, organization_id)
    references public.agenda_booking_units(id, organization_id) on delete cascade,
  foreign key (room_id, organization_id)
    references public.agenda_rooms(id, organization_id) on delete restrict
);

create table public.agenda_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  display_name text not null,
  role text not null default 'professional'
    check (role in ('professional', 'coordinator', 'technical_admin')),
  avatar_url text,
  is_active boolean not null default true,
  waived_morning_guarantee boolean not null default false,
  waived_afternoon_guarantee boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (id, organization_id),
  constraint agenda_members_display_name_length check (char_length(display_name) between 2 and 120)
);

create unique index agenda_members_one_active_membership_idx
  on public.agenda_members(user_id)
  where is_active;

create table public.agenda_member_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.agenda_organizations(id) on delete cascade,
  email text not null,
  role text not null default 'professional'
    check (role in ('professional', 'coordinator', 'technical_admin')),
  display_name text,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agenda_member_invitations_email_format check (
    email = lower(btrim(email)) and position('@' in email) > 1
  )
);

create unique index agenda_member_invitations_pending_email_idx
  on public.agenda_member_invitations(organization_id, lower(email))
  where is_active and accepted_at is null;

create table public.agenda_booking_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  booking_unit_id uuid not null,
  member_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  local_starts_at time not null,
  local_ends_at time not null,
  starts_on date not null,
  ends_on date,
  period_kind text not null check (period_kind in ('morning', 'afternoon', 'other')),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (booking_unit_id, organization_id)
    references public.agenda_booking_units(id, organization_id) on delete restrict,
  foreign key (member_id, organization_id)
    references public.agenda_members(id, organization_id) on delete restrict,
  constraint agenda_booking_series_time_order check (local_ends_at > local_starts_at),
  constraint agenda_booking_series_date_order check (ends_on is null or ends_on >= starts_on)
);

create table public.agenda_bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  booking_unit_id uuid not null,
  member_id uuid not null,
  series_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'ad_hoc' check (kind in ('ad_hoc', 'standing_allocation')),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  cancelled_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (booking_unit_id, organization_id)
    references public.agenda_booking_units(id, organization_id) on delete restrict,
  foreign key (member_id, organization_id)
    references public.agenda_members(id, organization_id) on delete restrict,
  foreign key (series_id, organization_id)
    references public.agenda_booking_series(id, organization_id) on delete restrict,
  constraint agenda_bookings_time_order check (ends_at > starts_at),
  constraint agenda_bookings_cancellation_consistency check (
    (status = 'confirmed' and cancelled_at is null and cancelled_by is null)
    or (status = 'cancelled' and cancelled_at is not null and cancelled_by is not null)
  ),
  constraint agenda_bookings_series_kind_consistency check (
    (series_id is null and kind = 'ad_hoc')
    or (series_id is not null and kind = 'standing_allocation')
  )
);

create index agenda_bookings_visible_range_idx
  on public.agenda_bookings(organization_id, starts_at, ends_at)
  where status = 'confirmed';

create index agenda_bookings_member_idx
  on public.agenda_bookings(member_id, starts_at desc);

create table public.agenda_room_occupancies (
  booking_id uuid not null,
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  room_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (booking_id, room_id),
  foreign key (booking_id, organization_id)
    references public.agenda_bookings(id, organization_id) on delete restrict,
  foreign key (room_id, organization_id)
    references public.agenda_rooms(id, organization_id) on delete restrict,
  constraint agenda_room_occupancies_time_order check (ends_at > starts_at),
  constraint agenda_room_occupancies_no_overlap exclude using gist (
    organization_id with =,
    room_id with =,
    period with &&
  ) where (status = 'confirmed')
);

create table public.agenda_booking_audit (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  booking_id uuid not null,
  action text not null check (action in ('created', 'rescheduled', 'cancelled')),
  actor_user_id uuid references auth.users(id) on delete set null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index agenda_booking_audit_booking_idx
  on public.agenda_booking_audit(booking_id, created_at desc);

create table public.agenda_calendar_event_links (
  booking_id uuid primary key,
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  google_calendar_id text,
  google_event_id text,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (booking_id, organization_id)
    references public.agenda_bookings(id, organization_id) on delete restrict
);

create unique index agenda_calendar_event_unique_idx
  on public.agenda_calendar_event_links(google_calendar_id, google_event_id)
  where google_event_id is not null;

create table public.agenda_integration_outbox (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.agenda_organizations(id) on delete restrict,
  booking_id uuid not null,
  action text not null check (action in ('upsert', 'cancel')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (booking_id, organization_id)
    references public.agenda_bookings(id, organization_id) on delete restrict,
  constraint agenda_integration_outbox_lock_consistency check (
    (status = 'processing' and locked_at is not null)
    or (status <> 'processing' and locked_at is null)
  )
);

create index agenda_integration_outbox_worker_idx
  on public.agenda_integration_outbox(status, available_at, id)
  where status in ('pending', 'failed');

create or replace function muvvital_agenda_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger agenda_organizations_set_updated_at
before update on public.agenda_organizations
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_rooms_set_updated_at
before update on public.agenda_rooms
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_booking_units_set_updated_at
before update on public.agenda_booking_units
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_members_set_updated_at
before update on public.agenda_members
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_booking_series_set_updated_at
before update on public.agenda_booking_series
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_bookings_set_updated_at
before update on public.agenda_bookings
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_room_occupancies_set_updated_at
before update on public.agenda_room_occupancies
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_calendar_event_links_set_updated_at
before update on public.agenda_calendar_event_links
for each row execute function muvvital_agenda_private.set_updated_at();

create trigger agenda_integration_outbox_set_updated_at
before update on public.agenda_integration_outbox
for each row execute function muvvital_agenda_private.set_updated_at();

create or replace function muvvital_agenda_private.is_active_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.agenda_members as member
    where member.organization_id = p_organization_id
      and member.user_id = (select auth.uid())
      and member.is_active
  );
$$;

create or replace function muvvital_agenda_private.is_coordinator(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.agenda_members as member
    where member.organization_id = p_organization_id
      and member.user_id = (select auth.uid())
      and member.is_active
      and member.role in ('coordinator', 'technical_admin')
  );
$$;

create or replace function muvvital_agenda_private.audit_booking_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  audit_action text;
begin
  if tg_op = 'INSERT' then
    audit_action := 'created';
  elsif old.status = 'confirmed' and new.status = 'cancelled' then
    audit_action := 'cancelled';
  else
    audit_action := 'rescheduled';
  end if;

  insert into public.agenda_booking_audit (
    organization_id,
    booking_id,
    action,
    actor_user_id,
    snapshot
  ) values (
    new.organization_id,
    new.id,
    audit_action,
    (select auth.uid()),
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger agenda_bookings_audit_change
after insert or update on public.agenda_bookings
for each row execute function muvvital_agenda_private.audit_booking_change();

alter table public.agenda_organizations enable row level security;
alter table public.agenda_rooms enable row level security;
alter table public.agenda_booking_units enable row level security;
alter table public.agenda_booking_unit_rooms enable row level security;
alter table public.agenda_members enable row level security;
alter table public.agenda_member_invitations enable row level security;
alter table public.agenda_booking_series enable row level security;
alter table public.agenda_bookings enable row level security;
alter table public.agenda_room_occupancies enable row level security;
alter table public.agenda_booking_audit enable row level security;
alter table public.agenda_calendar_event_links enable row level security;
alter table public.agenda_integration_outbox enable row level security;

create policy agenda_organizations_select_member
on public.agenda_organizations for select to authenticated
using ((select muvvital_agenda_private.is_active_member(id)));

create policy agenda_rooms_select_member
on public.agenda_rooms for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_booking_units_select_member
on public.agenda_booking_units for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_booking_unit_rooms_select_member
on public.agenda_booking_unit_rooms for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_members_select_team
on public.agenda_members for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_member_invitations_select_coordinator
on public.agenda_member_invitations for select to authenticated
using ((select muvvital_agenda_private.is_coordinator(organization_id)));

create policy agenda_booking_series_select_member
on public.agenda_booking_series for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_bookings_select_member
on public.agenda_bookings for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_calendar_event_links_select_member
on public.agenda_calendar_event_links for select to authenticated
using ((select muvvital_agenda_private.is_active_member(organization_id)));

create policy agenda_booking_audit_select_coordinator
on public.agenda_booking_audit for select to authenticated
using ((select muvvital_agenda_private.is_coordinator(organization_id)));

create policy agenda_integration_outbox_select_coordinator
on public.agenda_integration_outbox for select to authenticated
using ((select muvvital_agenda_private.is_coordinator(organization_id)));

create or replace function muvvital_agenda_private.validate_window(
  p_organization_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  organization_record public.agenda_organizations%rowtype;
  local_start timestamp;
  local_end timestamp;
  duration_minutes integer;
  start_minute_of_day integer;
  end_minute_of_day integer;
begin
  if p_starts_at is null or p_ends_at is null then
    raise exception using errcode = '22004', message = 'Las horas de inicio y fin son obligatorias';
  end if;
  select * into organization_record
  from public.agenda_organizations
  where id = p_organization_id;

  if not found then
    raise exception using errcode = '22023', message = 'Organización inexistente';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception using errcode = '22023', message = 'La hora de fin debe ser posterior';
  end if;
  if p_starts_at < now() then
    raise exception using errcode = '22007', message = 'No se puede reservar en el pasado';
  end if;

  local_start := p_starts_at at time zone organization_record.timezone;
  local_end := p_ends_at at time zone organization_record.timezone;
  if local_start::date <> local_end::date then
    raise exception using errcode = '22023', message = 'La reserva debe comenzar y terminar el mismo día local';
  end if;
  if local_start::time < organization_record.opens_at then
    raise exception using errcode = '22023', message = 'Inicio anterior al horario de apertura';
  end if;
  if local_end::time > organization_record.closes_at then
    raise exception using errcode = '22023', message = 'Fin posterior al horario de cierre';
  end if;
  if extract(second from local_start) <> 0
    or extract(second from local_end) <> 0 then
    raise exception using errcode = '22023', message = 'Las horas deben expresarse sin segundos';
  end if;

  duration_minutes := extract(epoch from (p_ends_at - p_starts_at))::integer / 60;
  if duration_minutes < organization_record.minimum_duration_minutes
    or duration_minutes > organization_record.maximum_duration_minutes then
    raise exception using errcode = '22023', message = 'Duración fuera de los límites configurados';
  end if;

  start_minute_of_day := extract(hour from local_start)::integer * 60
    + extract(minute from local_start)::integer;
  end_minute_of_day := extract(hour from local_end)::integer * 60
    + extract(minute from local_end)::integer;
  if start_minute_of_day % organization_record.slot_minutes <> 0
    or end_minute_of_day % organization_record.slot_minutes <> 0 then
    raise exception using errcode = '22023', message = 'Horario fuera de la granularidad configurada';
  end if;
end;
$$;

create or replace function muvvital_agenda_private.create_booking(
  p_booking_unit_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_kind text default 'ad_hoc'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := (select auth.uid());
  member_record public.agenda_members%rowtype;
  unit_record public.agenda_booking_units%rowtype;
  new_booking_id uuid;
  occupancy_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Autenticación requerida';
  end if;
  if p_kind is distinct from 'ad_hoc' then
    raise exception using errcode = '22023', message = 'Los turnos fijos se crean desde coordinación';
  end if;

  select * into unit_record
  from public.agenda_booking_units
  where id = p_booking_unit_id
    and is_active;
  if not found then
    raise exception using errcode = '22023', message = 'Unidad de reserva no disponible';
  end if;

  select * into member_record
  from public.agenda_members
  where user_id = actor_id
    and organization_id = unit_record.organization_id
    and is_active;
  if not found then
    raise exception using errcode = '42501', message = 'Miembro no autorizado';
  end if;

  perform muvvital_agenda_private.validate_window(
    member_record.organization_id,
    p_starts_at,
    p_ends_at
  );

  insert into public.agenda_bookings (
    organization_id,
    booking_unit_id,
    member_id,
    starts_at,
    ends_at,
    kind,
    status,
    created_by
  ) values (
    member_record.organization_id,
    unit_record.id,
    member_record.id,
    p_starts_at,
    p_ends_at,
    'ad_hoc',
    'confirmed',
    actor_id
  ) returning id into new_booking_id;

  insert into public.agenda_room_occupancies (
    booking_id,
    organization_id,
    room_id,
    starts_at,
    ends_at,
    status
  )
  select
    new_booking_id,
    mapping.organization_id,
    mapping.room_id,
    p_starts_at,
    p_ends_at,
    'confirmed'
  from public.agenda_booking_unit_rooms as mapping
  join public.agenda_rooms as room
    on room.id = mapping.room_id
   and room.organization_id = mapping.organization_id
  where mapping.booking_unit_id = unit_record.id
    and mapping.organization_id = member_record.organization_id
    and room.is_active
    and room.is_reservable;

  get diagnostics occupancy_count = row_count;
  if occupancy_count = 0 then
    raise exception using errcode = '23514', message = 'La unidad no contiene salas reservables activas';
  end if;

  insert into public.agenda_calendar_event_links (booking_id, organization_id, sync_status)
  values (new_booking_id, member_record.organization_id, 'pending');

  insert into public.agenda_integration_outbox (
    organization_id,
    booking_id,
    action,
    payload
  ) values (
    member_record.organization_id,
    new_booking_id,
    'upsert',
    jsonb_build_object('booking_id', new_booking_id)
  );

  return new_booking_id;
end;
$$;

create or replace function muvvital_agenda_private.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_record public.agenda_bookings%rowtype;
  actor_member public.agenda_members%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Autenticación requerida';
  end if;

  select * into booking_record
  from public.agenda_bookings
  where id = p_booking_id
  for update;
  if not found or booking_record.status <> 'confirmed' then
    raise exception using errcode = 'P0002', message = 'Reserva no disponible';
  end if;

  select * into actor_member
  from public.agenda_members
  where user_id = actor_id
    and organization_id = booking_record.organization_id
    and is_active;
  if not found then
    raise exception using errcode = '42501', message = 'Miembro no autorizado';
  end if;
  if actor_member.id <> booking_record.member_id
    and actor_member.role not in ('coordinator', 'technical_admin') then
    raise exception using errcode = '42501', message = 'No puedes cancelar una reserva ajena';
  end if;
  if booking_record.starts_at <= now() and actor_member.role = 'professional' then
    raise exception using errcode = '42501', message = 'Solo coordinación puede corregir una reserva iniciada';
  end if;

  update public.agenda_bookings
  set status = 'cancelled', cancelled_by = actor_id, cancelled_at = now()
  where id = booking_record.id;

  update public.agenda_room_occupancies
  set status = 'cancelled'
  where booking_id = booking_record.id and status = 'confirmed';

  update public.agenda_calendar_event_links
  set sync_status = 'pending', last_error = null
  where booking_id = booking_record.id;

  insert into public.agenda_integration_outbox (
    organization_id,
    booking_id,
    action,
    payload
  ) values (
    booking_record.organization_id,
    booking_record.id,
    'cancel',
    jsonb_build_object('booking_id', booking_record.id)
  );
end;
$$;

create or replace function muvvital_agenda_private.reschedule_booking(
  p_booking_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := (select auth.uid());
  booking_record public.agenda_bookings%rowtype;
  actor_member public.agenda_members%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Autenticación requerida';
  end if;

  select * into booking_record
  from public.agenda_bookings
  where id = p_booking_id
  for update;
  if not found or booking_record.status <> 'confirmed' then
    raise exception using errcode = 'P0002', message = 'Reserva no disponible';
  end if;

  select * into actor_member
  from public.agenda_members
  where user_id = actor_id
    and organization_id = booking_record.organization_id
    and is_active;
  if not found then
    raise exception using errcode = '42501', message = 'Miembro no autorizado';
  end if;
  if actor_member.id <> booking_record.member_id
    and actor_member.role not in ('coordinator', 'technical_admin') then
    raise exception using errcode = '42501', message = 'No puedes modificar una reserva ajena';
  end if;
  if booking_record.starts_at <= now() then
    raise exception using errcode = '42501', message = 'No se modifica una reserva ya iniciada';
  end if;

  perform muvvital_agenda_private.validate_window(
    booking_record.organization_id,
    p_starts_at,
    p_ends_at
  );

  update public.agenda_bookings
  set starts_at = p_starts_at, ends_at = p_ends_at
  where id = booking_record.id;

  update public.agenda_room_occupancies
  set starts_at = p_starts_at, ends_at = p_ends_at
  where booking_id = booking_record.id and status = 'confirmed';

  update public.agenda_calendar_event_links
  set sync_status = 'pending', last_error = null
  where booking_id = booking_record.id;

  insert into public.agenda_integration_outbox (
    organization_id,
    booking_id,
    action,
    payload
  ) values (
    booking_record.organization_id,
    booking_record.id,
    'upsert',
    jsonb_build_object('booking_id', booking_record.id)
  );
end;
$$;

create or replace function muvvital_agenda_private.claim_invitation()
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := (select auth.uid());
  auth_email text;
  auth_display_name text;
  invitation_record public.agenda_member_invitations%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Autenticación requerida';
  end if;
  if exists (select 1 from public.agenda_members where user_id = actor_id and is_active) then
    return true;
  end if;

  select
    lower(email),
    coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1))
  into auth_email, auth_display_name
  from auth.users
  where id = actor_id
    and email_confirmed_at is not null
    and (
      raw_app_meta_data ->> 'provider' = 'google'
      or coalesce(raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
    );
  if auth_email is null then
    return false;
  end if;

  select * into invitation_record
  from public.agenda_member_invitations
  where lower(email) = auth_email
    and is_active
    and accepted_at is null
  order by created_at
  limit 1
  for update skip locked;
  if not found then
    return false;
  end if;

  insert into public.agenda_members (
    organization_id,
    user_id,
    display_name,
    role,
    avatar_url
  ) values (
    invitation_record.organization_id,
    actor_id,
    coalesce(nullif(invitation_record.display_name, ''), auth_display_name),
    invitation_record.role,
    null
  );

  update public.agenda_member_invitations
  set accepted_by = actor_id, accepted_at = now(), is_active = false
  where id = invitation_record.id;
  return true;
end;
$$;

create or replace function public.agenda_create_booking(
  p_booking_unit_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_kind text default 'ad_hoc'
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select muvvital_agenda_private.create_booking(
    p_booking_unit_id,
    p_starts_at,
    p_ends_at,
    p_kind
  );
$$;

create or replace function public.agenda_cancel_booking(p_booking_id uuid)
returns void
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select muvvital_agenda_private.cancel_booking(p_booking_id);
$$;

create or replace function public.agenda_reschedule_booking(
  p_booking_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns void
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select muvvital_agenda_private.reschedule_booking(
    p_booking_id,
    p_starts_at,
    p_ends_at
  );
$$;

create or replace function public.agenda_claim_invitation()
returns boolean
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select muvvital_agenda_private.claim_invitation();
$$;

create or replace function public.agenda_claim_outbox_batch(p_limit integer default 20)
returns table (
  id bigint,
  organization_id uuid,
  booking_id uuid,
  action text,
  payload jsonb,
  attempts integer
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'El lote debe contener entre 1 y 100 trabajos';
  end if;

  -- Recover work abandoned by a crashed or timed-out Edge Function. The
  -- worker timeout must remain below this lease duration.
  update public.agenda_integration_outbox as stale
  set
    status = 'failed',
    attempts = case
      when stale.attempts < 2147483647 then stale.attempts + 1
      else stale.attempts
    end,
    available_at = now(),
    locked_at = null,
    last_error = 'Worker lease expired before completion'
  where stale.status = 'processing'
    and stale.locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select outbox.id
    from public.agenda_integration_outbox as outbox
    where outbox.status in ('pending', 'failed')
      and outbox.available_at <= now()
      and not exists (
        select 1
        from public.agenda_integration_outbox as earlier
        where earlier.booking_id = outbox.booking_id
          and earlier.id < outbox.id
          and earlier.status in ('pending', 'processing', 'failed')
      )
    order by outbox.available_at, outbox.id
    for update skip locked
    limit p_limit
  )
  update public.agenda_integration_outbox as outbox
  set status = 'processing', locked_at = now()
  from candidates
  where outbox.id = candidates.id
  returning
    outbox.id,
    outbox.organization_id,
    outbox.booking_id,
    outbox.action,
    outbox.payload,
    outbox.attempts;
end;
$$;

create or replace view public.agenda_booking_unit_directory
with (security_invoker = true)
as
select
  unit.id,
  unit.organization_id,
  unit.code,
  unit.name,
  unit.is_active,
  unit.sort_order,
  array_agg(room.name order by room.sort_order, room.name)::text[] as room_names
from public.agenda_booking_units as unit
join public.agenda_booking_unit_rooms as mapping
  on mapping.booking_unit_id = unit.id
 and mapping.organization_id = unit.organization_id
join public.agenda_rooms as room
  on room.id = mapping.room_id
 and room.organization_id = mapping.organization_id
group by unit.id, unit.organization_id, unit.code, unit.name, unit.is_active, unit.sort_order;

create or replace view public.agenda_booking_calendar
with (security_invoker = true)
as
select
  booking.id,
  booking.organization_id,
  booking.booking_unit_id,
  unit.code as booking_unit_code,
  unit.name as booking_unit_name,
  booking.member_id,
  member.display_name as professional_name,
  member.avatar_url,
  booking.starts_at,
  booking.ends_at,
  booking.kind,
  booking.status,
  coalesce(link.sync_status, 'pending') as sync_status,
  (
    member.user_id = (select auth.uid())
    or (select muvvital_agenda_private.is_coordinator(booking.organization_id))
  ) as can_manage
from public.agenda_bookings as booking
join public.agenda_booking_units as unit
  on unit.id = booking.booking_unit_id
 and unit.organization_id = booking.organization_id
join public.agenda_members as member
  on member.id = booking.member_id
 and member.organization_id = booking.organization_id
left join public.agenda_calendar_event_links as link
  on link.booking_id = booking.id
 and link.organization_id = booking.organization_id;

revoke all on table public.agenda_organizations from anon, authenticated, service_role;
revoke all on table public.agenda_rooms from anon, authenticated, service_role;
revoke all on table public.agenda_booking_units from anon, authenticated, service_role;
revoke all on table public.agenda_booking_unit_rooms from anon, authenticated, service_role;
revoke all on table public.agenda_members from anon, authenticated, service_role;
revoke all on table public.agenda_member_invitations from anon, authenticated, service_role;
revoke all on table public.agenda_booking_series from anon, authenticated, service_role;
revoke all on table public.agenda_bookings from anon, authenticated, service_role;
revoke all on table public.agenda_room_occupancies from anon, authenticated, service_role;
revoke all on table public.agenda_booking_audit from anon, authenticated, service_role;
revoke all on table public.agenda_calendar_event_links from anon, authenticated, service_role;
revoke all on table public.agenda_integration_outbox from anon, authenticated, service_role;
revoke all on table public.agenda_booking_unit_directory from anon, authenticated, service_role;
revoke all on table public.agenda_booking_calendar from anon, authenticated, service_role;
revoke all on sequence public.agenda_booking_audit_id_seq from anon, authenticated, service_role;
revoke all on sequence public.agenda_integration_outbox_id_seq from anon, authenticated, service_role;

grant select on table public.agenda_organizations to authenticated;
grant select on table public.agenda_rooms to authenticated;
grant select on table public.agenda_booking_units to authenticated;
grant select on table public.agenda_booking_unit_rooms to authenticated;
grant select on table public.agenda_members to authenticated;
grant select on table public.agenda_member_invitations to authenticated;
grant select on table public.agenda_booking_series to authenticated;
grant select on table public.agenda_bookings to authenticated;
grant select on table public.agenda_booking_audit to authenticated;
grant select on table public.agenda_calendar_event_links to authenticated;
grant select on table public.agenda_integration_outbox to authenticated;
grant select on table public.agenda_booking_unit_directory to authenticated;
grant select on table public.agenda_booking_calendar to authenticated;

revoke all on function public.agenda_create_booking(uuid, timestamptz, timestamptz, text) from public, anon;
revoke all on function public.agenda_cancel_booking(uuid) from public, anon;
revoke all on function public.agenda_reschedule_booking(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.agenda_claim_invitation() from public, anon;
revoke all on function public.agenda_claim_outbox_batch(integer) from public, anon, authenticated;
grant execute on function public.agenda_create_booking(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.agenda_cancel_booking(uuid) to authenticated;
grant execute on function public.agenda_reschedule_booking(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.agenda_claim_invitation() to authenticated;
grant execute on function public.agenda_claim_outbox_batch(integer) to service_role;

grant select on table public.agenda_bookings to service_role;
grant select on table public.agenda_booking_units to service_role;
grant select on table public.agenda_members to service_role;
grant select, update on table public.agenda_calendar_event_links to service_role;
grant select, update on table public.agenda_integration_outbox to service_role;

grant usage on schema muvvital_agenda_private to authenticated;
revoke all on all functions in schema muvvital_agenda_private
  from public, anon, authenticated, service_role;
grant execute on function muvvital_agenda_private.is_active_member(uuid) to authenticated;
grant execute on function muvvital_agenda_private.is_coordinator(uuid) to authenticated;
grant execute on function muvvital_agenda_private.create_booking(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function muvvital_agenda_private.cancel_booking(uuid) to authenticated;
grant execute on function muvvital_agenda_private.reschedule_booking(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function muvvital_agenda_private.claim_invitation() to authenticated;

insert into public.agenda_organizations (
  id,
  slug,
  name,
  timezone,
  opens_at,
  closes_at,
  slot_minutes,
  minimum_duration_minutes,
  maximum_duration_minutes
) values (
  '7a000000-0000-4000-8000-000000000001',
  'muvvital',
  'MÜV Vital',
  'Europe/Madrid',
  '08:00',
  '23:00',
  15,
  30,
  900
);

insert into public.agenda_rooms (
  id,
  organization_id,
  code,
  name,
  room_type,
  surface_m2,
  svg_key,
  is_reservable,
  sort_order
) values
  ('7a100000-0000-4000-8000-000000000001', '7a000000-0000-4000-8000-000000000001', 'CONSULTA', 'Consulta', 'clinical', 8.70, 'consulta', true, 10),
  ('7a100000-0000-4000-8000-000000000002', '7a000000-0000-4000-8000-000000000001', 'EXPLORACION', 'Exploración', 'clinical', 9.12, 'exploracion', true, 20),
  ('7a100000-0000-4000-8000-000000000003', '7a000000-0000-4000-8000-000000000001', 'PODOLOGIA', 'Podología', 'clinical', 8.70, 'podologia', true, 30),
  ('7a100000-0000-4000-8000-000000000004', '7a000000-0000-4000-8000-000000000001', 'ENTRENAMIENTO_PERSONAL', 'Entrenamiento personal', 'training', 11.29, 'entrenamiento-personal', false, 40);

insert into public.agenda_booking_units (
  id,
  organization_id,
  code,
  name,
  sort_order
) values
  ('7a200000-0000-4000-8000-000000000001', '7a000000-0000-4000-8000-000000000001', 'SUITE_CONSULTA_EXPLORACION', 'Suite Consulta + Exploración', 10),
  ('7a200000-0000-4000-8000-000000000002', '7a000000-0000-4000-8000-000000000001', 'PODOLOGIA', 'Sala de Podología', 20);

insert into public.agenda_booking_unit_rooms (
  organization_id,
  booking_unit_id,
  room_id
) values
  ('7a000000-0000-4000-8000-000000000001', '7a200000-0000-4000-8000-000000000001', '7a100000-0000-4000-8000-000000000001'),
  ('7a000000-0000-4000-8000-000000000001', '7a200000-0000-4000-8000-000000000001', '7a100000-0000-4000-8000-000000000002'),
  ('7a000000-0000-4000-8000-000000000001', '7a200000-0000-4000-8000-000000000002', '7a100000-0000-4000-8000-000000000003');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'agenda_bookings'
    ) then
    alter publication supabase_realtime add table public.agenda_bookings;
  end if;
end;
$$;
