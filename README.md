# MÜV Vital Agenda

Agenda interna para que el equipo de MÜV Vital reserve espacios clínicos y vea la ocupación en tiempo real.

## Alcance implementado

- horario operativo configurable, inicializado en **08:00–23:00**;
- dos unidades reservables: **Suite Consulta + Exploración** y **Podología**;
- Consulta y Exploración se reservan de forma conjunta y atómica;
- Entrenamiento personal aparece en el plano, pero no se puede reservar;
- vistas Ahora, Día, Semana y plano esquemático responsive;
- alta, reprogramación y cancelación lógica de reservas;
- Google Login mediante Supabase Auth y preautorización por invitación;
- RLS por organización y propiedad, con rol de coordinación;
- exclusión PostgreSQL GiST para impedir solapes concurrentes por sala física;
- Realtime sobre cambios de reservas;
- outbox y Edge Function para reflejar reservas en un Google Calendar compartido;
- modo demostración sin credenciales ni escrituras remotas;
- imagen Docker Nginx sin privilegios, cabeceras de seguridad, healthcheck y CI.

No se almacenan pacientes, diagnósticos, tratamientos, teléfonos ni notas clínicas.

## Estado de integración

El código y la migración están preparados, pero **la migración no se ha aplicado** al proyecto Supabase existente `cumkjqkknicjrnvwejgk`. Antes se exige auditoría de solo lectura y autorización separada. Este repositorio no crea proyectos Supabase.

## Desarrollo local

Requisitos: Node.js 22.12 o superior; CI usa Node 24.14.

```bash
npm ci
npm run dev
```

La aplicación abre en `http://localhost:5173`. Sin `.env`, el acceso real queda desactivado y puede utilizarse **Abrir demostración**.

Para habilitar el proyecto autorizado:

```bash
cp .env.example .env.local
```

Completar únicamente `VITE_SUPABASE_PUBLISHABLE_KEY` con una clave publicable. Nunca usar una clave secreta en el frontend.

## Verificación

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

La suite cubre el ejemplo viernes 15:30–18:00, límites 08:00–23:00, bloques de 15 minutos, duración mínima de 30 minutos, intervalos contiguos, solapes y contratos estáticos de RLS/concurrencia.

## Parámetros de negocio

| Parámetro | Valor inicial | Estado |
|---|---:|---|
| Apertura | 08:00 | Confirmado |
| Cierre | 23:00 | Confirmado |
| Granularidad | 15 min | Configurable; pendiente de confirmación |
| Duración mínima | 30 min | Configurable; pendiente de confirmación |
| Duración máxima | 15 h | Permite jornada completa; configurable |
| Mañana | 08:00–14:00 | Provisional |
| Tarde | 14:00–23:00 | Provisional |

El esquema incluye series y renuncias de cobertura, pero la asignación de mañanas/tardes requiere los cuatro profesionales reales, sus preferencias y el horizonte de recurrencia.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): blueprint consolidado y decisiones.
- [`docs/OPERACION_Y_DESPLIEGUE.md`](docs/OPERACION_Y_DESPLIEGUE.md): Supabase, Google Calendar y Dokploy.
- [`supabase/migrations/20260807010418_init_agenda.sql`](supabase/migrations/20260807010418_init_agenda.sql): esquema versionado, todavía no aplicado.
- [`supabase/audit/00_preflight_read_only.sql`](supabase/audit/00_preflight_read_only.sql): comprobación sin escrituras previa al despliegue.
- [`supabase/audit/01_postdeploy_verification.sql`](supabase/audit/01_postdeploy_verification.sql): verificación sin escrituras posterior al despliegue.

## Identidad visual

Se usan los tokens oficiales 2026: Deep Blue `#244C5D`, Soft Bone `#D8D4D7`, Vital Teal `#088793`, Ocean Recovery `#6BB0B1`, Golden Balance `#C1A027`, Active Pulse `#E87928` y Liquid Silver `#97A5B9`.

Playfair Display y Source Sans 3 están autoalojadas. Just Sans se declara como primera opción, pero no se distribuye porque falta el archivo/licencia web. Los JPEG de logo suministrados se conservan sin reconstruir; deben reemplazarse por los masters vectoriales cuando estén disponibles.

## Restricciones

- no tocar ni depender de `MUVITAL-WEB`;
- no crear proyectos Supabase;
- no aplicar migraciones sin autorización;
- no usar Google Calendar como autoridad de disponibilidad;
- no introducir n8n en la transacción de reserva;
- no incluir datos de pacientes ni secretos en Git.
