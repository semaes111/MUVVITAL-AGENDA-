-- MÜV Vital Agenda: verificación de solo lectura posterior a la migración.

with expected_tables(table_name) as (
  values
    ('agenda_organizations'),
    ('agenda_rooms'),
    ('agenda_booking_units'),
    ('agenda_booking_unit_rooms'),
    ('agenda_members'),
    ('agenda_member_invitations'),
    ('agenda_booking_series'),
    ('agenda_bookings'),
    ('agenda_room_occupancies'),
    ('agenda_booking_audit'),
    ('agenda_calendar_event_links'),
    ('agenda_integration_outbox')
)
select
  expected.table_name,
  classes.oid is not null as exists,
  coalesce(classes.relrowsecurity, false) as rls_enabled,
  coalesce(classes.relforcerowsecurity, false) as rls_forced
from expected_tables as expected
left join pg_class as classes
  on classes.relname = expected.table_name
 and classes.relnamespace = 'public'::regnamespace
order by expected.table_name;

select
  policy.schemaname,
  policy.tablename,
  policy.policyname,
  policy.roles,
  policy.cmd,
  policy.qual,
  policy.with_check
from pg_policies as policy
where policy.schemaname = 'public'
  and policy.tablename like 'agenda\_%' escape '\'
order by policy.tablename, policy.policyname;

select
  namespace.nspname as schema_name,
  procedure.proname as function_name,
  pg_get_function_identity_arguments(procedure.oid) as arguments,
  procedure.prosecdef as security_definer,
  procedure.proconfig as function_config
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where procedure.proname like 'agenda\_%' escape '\'
   or namespace.nspname = 'muvvital_agenda_private'
order by namespace.nspname, procedure.proname, arguments;

select
  grant_info.grantee,
  grant_info.table_name,
  grant_info.privilege_type
from information_schema.role_table_grants as grant_info
where grant_info.table_schema = 'public'
  and grant_info.table_name like 'agenda\_%' escape '\'
  and grant_info.grantee in ('anon', 'authenticated', 'service_role')
order by grant_info.table_name, grant_info.grantee, grant_info.privilege_type;

select
  publication.schemaname,
  publication.tablename
from pg_publication_tables as publication
where publication.pubname = 'supabase_realtime'
  and publication.schemaname = 'public'
  and publication.tablename = 'agenda_bookings';

select
  (select count(*) from public.agenda_organizations) as organizations,
  (select count(*) from public.agenda_rooms) as rooms,
  (select count(*) from public.agenda_booking_units) as booking_units,
  (select count(*) from public.agenda_booking_unit_rooms) as room_mappings;

select
  unit.code as booking_unit,
  array_agg(room.code order by room.sort_order) as physical_rooms
from public.agenda_booking_units as unit
join public.agenda_booking_unit_rooms as mapping
  on mapping.booking_unit_id = unit.id
 and mapping.organization_id = unit.organization_id
join public.agenda_rooms as room
  on room.id = mapping.room_id
 and room.organization_id = mapping.organization_id
group by unit.id, unit.code
order by unit.sort_order;

select
  status,
  count(*) as jobs,
  min(locked_at) as oldest_lock
from public.agenda_integration_outbox
group by status
order by status;
