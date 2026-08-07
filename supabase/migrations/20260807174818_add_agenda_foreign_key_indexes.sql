-- MÜV Vital Agenda: covering indexes for every foreign key reported by
-- Supabase's 0001_unindexed_foreign_keys performance lint.

create index agenda_booking_audit_actor_user_id_idx
  on public.agenda_booking_audit(actor_user_id);

create index agenda_booking_audit_organization_id_idx
  on public.agenda_booking_audit(organization_id);

create index agenda_booking_series_booking_unit_org_idx
  on public.agenda_booking_series(booking_unit_id, organization_id);

create index agenda_booking_series_created_by_idx
  on public.agenda_booking_series(created_by);

create index agenda_booking_series_member_org_idx
  on public.agenda_booking_series(member_id, organization_id);

create index agenda_booking_series_organization_id_idx
  on public.agenda_booking_series(organization_id);

create index agenda_booking_unit_rooms_booking_unit_org_idx
  on public.agenda_booking_unit_rooms(booking_unit_id, organization_id);

create index agenda_booking_unit_rooms_organization_id_idx
  on public.agenda_booking_unit_rooms(organization_id);

create index agenda_booking_unit_rooms_room_org_idx
  on public.agenda_booking_unit_rooms(room_id, organization_id);

create index agenda_bookings_booking_unit_org_idx
  on public.agenda_bookings(booking_unit_id, organization_id);

create index agenda_bookings_cancelled_by_idx
  on public.agenda_bookings(cancelled_by);

create index agenda_bookings_created_by_idx
  on public.agenda_bookings(created_by);

create index agenda_bookings_member_org_idx
  on public.agenda_bookings(member_id, organization_id);

create index agenda_bookings_series_org_idx
  on public.agenda_bookings(series_id, organization_id);

create index agenda_calendar_event_links_booking_org_idx
  on public.agenda_calendar_event_links(booking_id, organization_id);

create index agenda_calendar_event_links_organization_id_idx
  on public.agenda_calendar_event_links(organization_id);

create index agenda_integration_outbox_booking_org_idx
  on public.agenda_integration_outbox(booking_id, organization_id);

create index agenda_integration_outbox_organization_id_idx
  on public.agenda_integration_outbox(organization_id);

create index agenda_member_invitations_accepted_by_idx
  on public.agenda_member_invitations(accepted_by);

create index agenda_member_invitations_invited_by_idx
  on public.agenda_member_invitations(invited_by);

create index agenda_room_occupancies_booking_org_idx
  on public.agenda_room_occupancies(booking_id, organization_id);

create index agenda_room_occupancies_room_org_idx
  on public.agenda_room_occupancies(room_id, organization_id);
