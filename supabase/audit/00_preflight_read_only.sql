-- MÜV Vital Agenda: preflight de solo lectura.
-- Ejecutar en el proyecto cumkjqkknicjrnvwejgk antes de la migración.
-- Este fichero no contiene DDL ni DML.

select
  current_database() as database_name,
  current_setting('server_version') as postgres_version,
  current_user as execution_role,
  now() as checked_at;

with expected_relations(object_name) as (
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
    ('agenda_integration_outbox'),
    ('agenda_booking_unit_directory'),
    ('agenda_booking_calendar')
)
select
  object_name,
  to_regclass(format('public.%I', object_name)) as existing_object
from expected_relations
order by object_name;

select
  namespace.nspname as schema_name,
  procedure.proname as function_name,
  pg_get_function_identity_arguments(procedure.oid) as arguments
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where procedure.proname like 'agenda\_%' escape '\'
   or namespace.nspname = 'muvvital_agenda_private'
order by namespace.nspname, procedure.proname, arguments;

select
  namespace.nspname as existing_private_schema
from pg_namespace as namespace
where namespace.nspname = 'muvvital_agenda_private';

select
  extension.extname,
  namespace.nspname as installed_schema,
  extension.extversion
from pg_extension as extension
join pg_namespace as namespace on namespace.oid = extension.extnamespace
where extension.extname = 'btree_gist';

select
  publication.pubname,
  publication.puballtables
from pg_publication as publication
where publication.pubname = 'supabase_realtime';

select
  migration.version,
  migration.name
from supabase_migrations.schema_migrations as migration
order by migration.version desc
limit 10;

