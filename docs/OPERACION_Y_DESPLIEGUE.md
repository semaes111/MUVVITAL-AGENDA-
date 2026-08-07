# Operación y despliegue

## Estado seguro de partida

El repositorio puede arrancar en modo demostración sin credenciales. No se ha creado ningún proyecto Supabase ni se ha aplicado la migración al proyecto existente `cumkjqkknicjrnvwejgk`.

Antes de conectar producción:

1. ejecutar `supabase/audit/00_preflight_read_only.sql` en el proyecto existente;
2. comprobar colisiones de objetos, versión PostgreSQL, extensiones, RLS, Auth, Realtime y consumidores actuales;
3. hacer copia de seguridad y definir rollback;
4. revisar la migración `supabase/migrations/20260807010418_init_agenda.sql`;
5. obtener autorización expresa para aplicarla;
6. ejecutar `supabase/audit/01_postdeploy_verification.sql` y los advisors de seguridad y rendimiento después de aplicarla;
7. probar concurrencia y RLS con usuarios reales, nunca solo como `postgres` o con clave secreta.

Todos los objetos de esta aplicación usan el prefijo `agenda_` y las funciones privilegiadas viven en `muvvital_agenda_private` para reducir el riesgo de colisión dentro del proyecto compartido.

## Alta inicial

Después de una migración autorizada, el primer coordinador se preautoriza desde SQL. Sustituir el email y nombre por datos reales:

```sql
insert into public.agenda_member_invitations (
  organization_id,
  email,
  display_name,
  role
) values (
  '7a000000-0000-4000-8000-000000000001',
  lower('coordinador@dominio.tld'),
  'Nombre del coordinador',
  'coordinator'
);
```

El primer inicio con Google vincula la invitación al UUID de `auth.users`. Desde ese momento la autorización usa `auth.uid()`, no el email.

## Google Auth

Configurar en el proyecto existente:

- proveedor Google habilitado;
- URL del sitio: `https://agenda.muvvital.com`;
- redirects permitidos: `https://agenda.muvvital.com` y el origen local durante desarrollo;
- scopes básicos de identidad; no solicitar Calendar en el login de cada profesional.

## Google Calendar

La función `sync-google-calendar` consume el outbox de forma asíncrona. Requiere estos secretos de backend:

- `SUPABASE_URL`;
- `SUPABASE_SECRET_KEYS`, inyectado automáticamente por Supabase en el formato vigente;
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`;
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`;
- `GOOGLE_CALENDAR_ID`;
- `CRON_SECRET`.

Para despliegues antiguos se admite `SUPABASE_SERVICE_ROLE_KEY`; para pruebas locales controladas también puede definirse `SUPABASE_SECRET_KEY`. Ninguna de estas claves debe entrar en variables `VITE_*`, imágenes Docker, logs o Git.

`supabase/config.toml` desactiva `verify_jwt` únicamente para este worker porque el programador no envía un JWT de usuario. El handler rechaza cualquier petición que no presente `CRON_SECRET` en `Authorization: Bearer ...`.

Crear un calendario secundario de MÜV Vital, compartirlo con permiso de escritura con la cuenta técnica y conceder lectura a los profesionales. La cuenta técnica no necesita delegación de dominio si el calendario concreto se comparte directamente con ella.

La función genera IDs deterministas base32hex, reintenta con backoff y nunca incluye datos de pacientes. La agenda PostgreSQL continúa siendo válida aunque Google esté caído.

El claim del outbox serializa los trabajos pendientes de una misma reserva y recupera locks abandonados tras diez minutos. El tiempo máximo de ejecución del worker debe permanecer por debajo de ese lease.

## Dokploy

1. Crear una aplicación desde este repositorio y seleccionar `Dockerfile` o `compose.yaml`.
2. Añadir como build args solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Publicar el puerto interno `8080` bajo `agenda.muvvital.com`.
4. Activar TLS y comprobar `/healthz`.
5. Verificar login, RLS, una reserva concurrente y Realtime antes de abrir el acceso al equipo.

No introducir claves secretas en variables `VITE_*`: Vite las incorpora al JavaScript público.
