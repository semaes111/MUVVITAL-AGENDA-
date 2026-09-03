# DOSSIER VIGENTE · R1 · MUVVITAL-AGENDA
### Documento de consenso — consolidación de 1 informe sellado, BLOQUE-B1 (raíz, .github, docs, src, supabase, tests)

> **Procedencia de esta síntesis.** Documento fusionado a partir de dos candidatos de ronda 1. Todo el contenido sustantivo procede del candidato `claude`, único que auditó el material. El candidato `glm` declaró estado «BLOQUEADO — ENTRADA VACÍA» y entregó cero hallazgos, cero sobreclaims y cero citas; su aportación se registra íntegra en el anexo §10 y en la contradicción CT-5. **No se ha promovido ninguna afirmación ausente de las dos fuentes.**
> **Base documental.** Única entrada auditada: `FUENTE/BLOQUES/INFORME-B1.md` y `FUENTE/BLOQUES/HANDOFF-B1.json` (sha256 `6781c806…f45c1c`). No hay otros bloques sellados en el paquete. **Ninguna afirmación nueva sobre el material original**: donde B1 no dice, aquí se declara hueco.
> **Embudo aplicado.** Entradas: 10 déficits (D1–D10) + 12 hallazgos de handoff + 7 sobreclaims + 4 preguntas + 2 interfaces. Salida: **10 déficits consolidados** (C1–C10) tras fusionar 4 duplicados de handoff dentro de entradas mayores, **6 sobreclaims** (uno absorbido como déficit), **5 contradicciones nombradas**, **1 pregunta cerrada de 4**.
> **Etiquetas.** [MEDIDO] = B1 lo verifica por lectura del fichero:línea citado. [DECLARADO] = lo afirma la documentación del propio bloque. [INFERIDO] = deducción no ejecutada.
> **Techo de confianza heredado — vale para TODO el dossier.** BLOQUE-B1/§preámbulo: «No se pudo instalar dependencias ni ejecutar `npm test`, `tsc` ni `docker build` en el entorno de auditoría. Ningún [MEDIDO] procede de ejecución; todos proceden de lectura.» En consecuencia: **ninguna prueba de aceptación de este dossier se ha ejecutado jamás**. Son comandos propuestos, no resultados obtenidos. El [MEDIDO] de este dossier significa *leído en la línea citada*, nunca *observado en ejecución*.

---

## 1 · Qué es y qué papel cumple

[MEDIDO vía BLOQUE-B1/§1] SPA React 19 + TypeScript + Vite, servida estáticamente por Nginx en contenedor, contra un único proyecto Supabase preexistente. 50 ficheros, 6829 LOC excluido `package-lock.json`.

Cuatro piezas, todas dentro del mismo bloque — es decir, **el sistema completo cabe en B1**; no hay superficie de integración con otros bloques auditados en este paquete:

1. **Frontend** — `FUENTE/src/` (22 ficheros): login Google, vistas Ahora/Día/Semana/Plano y un modo demostración autocontenido (`FUENTE/src/lib/demo-data.ts:43`).
2. **Autoridad de datos** — `FUENTE/supabase/migrations/20260807010418_init_agenda.sql` (1153 líneas): 12 tablas `agenda_*`, 2 vistas, RLS, exclusión GiST anti-solape, RPC transaccionales en esquema privado, outbox.
3. **Worker de integración** — `FUENTE/supabase/functions/sync-google-calendar/index.ts` (313 líneas): drena el outbox hacia un Google Calendar compartido con cuenta de servicio.
4. **Cadena de entrega** — `FUENTE/Dockerfile`, `FUENTE/nginx.conf`, `FUENTE/compose.yaml`, `FUENTE/.github/workflows/ci.yml`.

**El eje del sistema, y por qué importa para leer el resto.** BLOQUE-B1/§1 sitúa el invariante fundacional en el lado correcto de la frontera: «PostgreSQL como única autoridad de disponibilidad» (`FUENTE/docs/ARQUITECTURA.md:33`) se materializa como constraint de exclusión por sala física (`…init_agenda.sql:214`), no como comprobación de cliente. Ese acierto es la vara de medir de todo lo demás: **el patrón de fallo del bloque es que el segundo invariante del dominio —la suite indivisible— no recibió el mismo tratamiento** (C2), y que las tres capas de cierre (entrega, integración, pruebas) no rematan lo que el diseño de datos sí hace bien.

---

## 2 · Vivo · apagado por política · no comisionado · averiado

Definiciones operativas adoptadas (BLOQUE-B1/§7, procedentes del candidato `glm` en rondas previas y conservadas por B1): *apagado-por-política* = flag o configuración explícita desactiva la ruta y hay registro de decisión; *no-comisionado* = la ruta no existe en el código; *averiado* = la ruta existe y su prueba de aceptación falla.

### 2.1 Vivo y verificable por lectura [MEDIDO, BLOQUE-B1/§2.1]

| Capacidad | Evidencia citada por B1 |
|---|---|
| Exclusión anti-solape por sala | `…init_agenda.sql:214` — exclusión GiST sobre `period` con `where (status = 'confirmed')` |
| Cancelación lógica + auditoría | `…init_agenda.sql:392` — trigger `agenda_bookings_audit_change` |
| Fail-closed de escrituras del navegador | 11 políticas, **todas** `for select to authenticated`; 0 políticas de INSERT/UPDATE/DELETE y sin grant de escritura a `authenticated` (`…init_agenda.sql:1041`). Escritura solo vía RPC |
| Fail-closed de configuración | `FUENTE/src/lib/env.ts:6` — si la URL no es la autorizada o falta la clave, la configuración queda nula y el cliente nunca se crea (`FUENTE/src/lib/supabase.ts:9`) |
| Realtime | publicación condicional `…init_agenda.sql:1149` + suscripción `FUENTE/src/hooks/useAgenda.ts:82` |
| Traducción del conflicto 23P01 a lenguaje humano | `FUENTE/src/lib/agenda-service.ts:154` |

### 2.2 Apagado por política — correcto, no es defecto [MEDIDO, BLOQUE-B1/§2.2]

- **Google Login**: sin clave publicable el botón se renderiza deshabilitado (`FUENTE/src/components/LoginScreen.tsx:59`).
- **Membresías reales**: ninguna fila de invitación sembrada; el alta del primer coordinador es un insert manual documentado (`FUENTE/docs/OPERACION_Y_DESPLIEGUE.md:26`), coherente con `FUENTE/README.md:25`.
- **Series y turnos fijos**: tablas y constraints existen (`…init_agenda.sql:134`) pero no hay RPC, política ni UI que las cree. Declarado pendiente en `FUENTE/README.md:69`. B1 lo califica de «no comisionado y honesto» — se conserva aquí bajo *apagado por política* porque hay registro explícito de la decisión.

### 2.3 No comisionado, y la documentación no lo dice [MEDIDO, BLOQUE-B1/§2.3]

- **Al worker de Google Calendar no lo invoca nadie.** `FUENTE/supabase/config.toml:3` afirma que un planificador invoca el endpoint con CRON_SECRET; ese planificador no existe bajo FUENTE: cero `pg_cron`, cero `Deno.cron`, cero `schedule:` en `FUENTE/.github/workflows/ci.yml`. Medido por barrido del árbol. → **C3**.

### 2.4 Averiado [MEDIDO, BLOQUE-B1/§2.4]

- Las cabeceras de seguridad HTTP no llegan a ninguna respuesta → **C1**.
- La suite indivisible puede reservarse a medias sin error → **C2**.
- Un `booking_unit` nuevo en base de datos deja la aplicación inaccesible → **C4**.

### 2.5 Estado no determinable desde este paquete — hueco declarado

B1 no puede pronunciarse, y ningún otro bloque lo cubre, sobre: el estado real del proyecto Supabase remoto; la configuración del proveedor Google en el panel de Supabase; los secretos del worker; DNS y TLS del subdominio (BLOQUE-B1/§6, «fuera de alcance de este bloque»). **Todo el estatus de producción del sistema desplegado es, en este dossier, no observado.**

---

## 3 · Calidad y seguridad del código

**Secretos: limpio.** [MEDIDO, BLOQUE-B1/§3] Barrido de `sb_secret_`, `eyJ…`, `BEGIN PRIVATE KEY`, `AIza` y `ghp_` sobre todo FUENTE: cero coincidencias reales. Los dos únicos aciertos son el regex de la propia prueba (`FUENTE/tests/schema.contract.test.ts:109`) y el parser PEM del worker (`…sync-google-calendar/index.ts:287`). `FUENTE/.env.example:5` tiene la clave vacía y `FUENTE/.gitignore:5` cubre `.env.*` con excepción para el ejemplo. **Es el punto más sólido del bloque después del diseño de datos.**

**Superficie privilegiada.** El esquema no expuesto es nominal: `…init_agenda.sql:10` revoca el esquema privado a `authenticated` y `…init_agenda.sql:1072` se lo devuelve con `grant usage`, más EXECUTE sobre las seis funciones definer. B1 lo explica como consecuencia necesaria de que los envoltorios públicos sean `security invoker`, no como descuido; pero la propiedad de defensa que la documentación reclama no se obtiene. → **C7**.

**Dependencias.** [MEDIDO, BLOQUE-B1/§3] `FUENTE/package.json` fija versiones exactas sin rangos para las 27 dependencias; `FUENTE/.github/dependabot.yml` agrupa actualizaciones semanales; `FUENTE/.github/workflows/ci.yml:32` ejecuta auditoría con umbral alto. **Inconsistencia de endurecimiento:** `FUENTE/Dockerfile:5` instala con scripts desactivados y `…ci.yml:28` no, de modo que los scripts de ciclo de vida sí corren en CI. Imágenes fijadas por etiqueta y no por digest (`FUENTE/Dockerfile:14`). `…ci.yml:41` construye la imagen y la descarta sin escanearla ni firmarla.

**Deuda concreta** (consolidada; los tres puntos que B1 lista aquí reaparecen en §4 y no se cuentan dos veces): tipado que no cubre worker ni tests → C6; comparación de secreto en tiempo no constante → C9; la regla que impide funciones definer en `public` es una heurística de ventana fija (`FUENTE/tests/schema.contract.test.ts:56`) que una firma más larga esquiva — prueba-proxy, no invariante → absorbida en C5.

---

## 4 · Déficits consolidados P0..P3

**Mapa de deduplicación** (12 hallazgos de handoff + 10 déficits de informe → 10 entradas):

| Consolidado | Absorbe de BLOQUE-B1 |
|---|---|
| C1 | D1 + handoff `nginx-headers-inertes` + sobreclaim S4 |
| C2 | D2 + handoff `suite-no-atomica-por-sala-inactiva` + handoff `directorio-ignora-sala-inactiva` + sobreclaim S7 |
| C3 | D3 + handoff `outbox-sin-planificador` + handoff `outbox-sin-tope-reintentos` + §2.3 + sobreclaim S2 |
| C4 | D4 + handoff `zenum-unidad-rompe-app` |
| C5 | D5 + handoff `cero-pruebas-de-base-de-datos` + §3 (heurística de ventana fija) + sobreclaim S5 |
| C6 | D6 + handoff `edge-function-sin-typecheck` + §3 deuda |
| C7 | D7 + handoff `esquema-privado-expuesto` + §3 superficie privilegiada |
| C8 | D8 + handoff `horario-cableado-en-cliente` + sobreclaim S3 |
| C9 | D9 + handoff `cron-secret-comparacion-insegura` + §3 dependencias (imagen sin escaneo) |
| C10 | D10 + handoff `rol-tecnico-rotulado-profesional` |

La prioridad global es la de B1 salvo donde se indica; con un solo bloque no hay competencia entre bloques, pero sí **dos discrepancias internas de severidad resueltas aquí** (ver CT-2).

---

### C1 · P0 · Nginx descarta todas las cabeceras de seguridad en el 100 % de las respuestas

**Impacto.** [MEDIDO por lectura; la semántica de herencia es [INFERIDO] de la documentación de nginx — así lo marca B1] En nginx las directivas `add_header` de un nivel se heredan solo si el nivel hijo no define ninguna. `FUENTE/nginx.conf:10`–`:16` declaran CSP, HSTS, COOP, Permissions-Policy, Referrer-Policy, nosniff y anti-framing en el bloque `server`. Pero los cuatro `location` definen `add_header` propio: `nginx.conf:20` (Content-Type), `:27`, `:33` y `:38` (Cache-Control). Como toda petición cae en alguno de esos cuatro bloques, **ninguna respuesta —ni el HTML ni el JS— lleva CSP, HSTS ni anti-clickjacking**. El sufijo `always` no altera la herencia. La aplicación queda embebible en un iframe y sin CSP frente a XSS.

**Corrección.** Extraer las siete cabeceras a un fichero y añadir un `include` dentro de cada uno de los cuatro `location`, o repetirlas literalmente en cada bloque.

**Prueba de aceptación** (no ejecutada; ver techo de confianza):

    docker build -t agenda-headers . && docker run -d --rm -p 8080:8080 --name h agenda-headers
    sleep 5
    for h in content-security-policy strict-transport-security x-frame-options x-content-type-options; do
      curl -sI http://127.0.0.1:8080/ | grep -qi "^$h:" || { echo "FALTA $h"; exit 1; }
    done
    echo OK; docker rm -f h

B1 predice fallo en la primera iteración del bucle.

---

### C2 · P1 · La suite indivisible se reserva a medias, en silencio, y la interfaz lo oculta

*(Entrada única: fusiona el defecto de la RPC, el defecto de la vista de directorio que lo hace invisible, y el sobreclaim S7 que lo contradice.)*

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D2] El alta expande la unidad a sus salas con dos filtros: `…init_agenda.sql:612` exige `room.is_active` y la línea siguiente `room.is_reservable`. La única salvaguarda posterior es un conteo **contra cero** en `…init_agenda.sql:616`: si se creó *alguna* ocupación, la transacción confirma. Consecuencia: marcar Exploración como inactiva —operación de datos legítima, p. ej. una sala en obras— hace que reservar la suite genere **una sola** ocupación. Consulta queda bloqueada, Exploración queda libre para que otra persona la reserve por separado, y **no se emite ningún error**. Ninguna constraint, trigger ni comprobación ata el número de ocupaciones a la composición declarada de la unidad. La exclusión GiST sigue funcionando por sala, pero deja de proteger lo que la unidad prometía.

**Agravante — el fallo es invisible en la UI.** La vista de directorio agrega los nombres de sala en `…init_agenda.sql:982` uniendo `agenda_rooms` en `…:987` **sin filtrar `is_active`**, así que la tarjeta seguirá rotulando Consulta + Exploración (`FUENTE/src/components/RoomStatusCards.tsx:39`) mientras solo se reserva una de las dos.

**Escalada condicionada.** BLOQUE-B1/§HANDOFF-Preguntas declara: si existe un proceso operativo que marque salas como inactivas o no reservables, este déficit **sube a P0**. Esa pregunta queda **abierta** (Q3, §6). Se mantiene P1 por defecto, con la escalada explícitamente pendiente de un dato que este paquete no contiene.

**Corrección.** (a) Registrar en `agenda_booking_units` el número esperado de salas, o comparar el `row_count` obtenido contra `select count(*) from agenda_booking_unit_rooms where booking_unit_id = unit_record.id` y abortar si difieren, sustituyendo la comprobación contra cero de la línea 616. (b) Alinear la vista de directorio con el mismo filtro `is_active`/`is_reservable` que usa el alta, para que la UI nunca prometa una composición que la RPC no va a ocupar.

**Prueba de aceptación:**

    update public.agenda_rooms set is_active = false where code = 'EXPLORACION';
    -- debe fallar con excepcion, no confirmar:
    select public.agenda_create_booking('7a200000-0000-4000-8000-000000000001', now()+interval '1 day', now()+interval '1 day 1 hour');
    -- y si confirmara, esta consulta debe devolver 2, nunca 1:
    select count(*) from public.agenda_room_occupancies where booking_id = :id;

B1 predice: hoy confirma y devuelve 1.

---

### C3 · P1 · El outbox nunca se drena, y los fallos se reclaman para siempre

*(Entrada única: fusiona `outbox-sin-planificador` (P1) y `outbox-sin-tope-reintentos` (P2 en handoff, tratado como agravante del mismo camino en §4). Ver CT-2.)*

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D3] Cada alta, reprogramación y cancelación encola trabajo (`…init_agenda.sql:623`, `:691`, `:767`) y marca el enlace como pendiente. `FUENTE/README.md:17` lista el outbox y la Edge Function bajo el epígrafe de **alcance implementado**. No hay planificador en ninguna parte de FUENTE. La tabla crece sin límite y el estado de sincronización queda en pendiente para siempre — justo lo que el coordinador debe vigilar según `FUENTE/docs/ARQUITECTURA.md:508`.

**Agravante en el mismo camino.** No hay tope de reintentos: `…init_agenda.sql:945` vuelve a reclamar los trabajos fallidos indefinidamente, y la serialización por reserva de `…init_agenda.sql:947` hace que un trabajo permanentemente fallido **bloquee para siempre todos los posteriores de esa misma reserva**. `FUENTE/docs/ARQUITECTURA.md:509` promete alerta al superar el número máximo de reintentos: ese máximo no existe en el esquema.

**Corrección.** (a) Versionar el planificador como artefacto del repositorio: migración con `cron.schedule` cada dos minutos o job equivalente, con el secreto en la cabecera. (b) Añadir `max_attempts` a la tabla de outbox y excluir en la línea 945 los trabajos que lo superen, moviéndolos a un estado terminal visible.

**Prueba de aceptación.** Crear una reserva, esperar tres minutos y comprobar que `select sync_status from public.agenda_calendar_event_links where booking_id = :id` devuelve `synced`. Para el tope: forzar un identificador de calendario inválido, invocar el worker seis veces, y comprobar que ese trabajo deja de reclamarse y que un trabajo de otra reserva sí progresa.

---

### C4 · P1 · Un dato nuevo rompe la aplicación entera, no solo la unidad nueva

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D4] `FUENTE/src/lib/agenda-service.ts:18` valida el código de unidad contra una enumeración cerrada de dos valores, y `:27` hace lo mismo con el código en las reservas. Como `:78` parsea el array completo, **una sola unidad con código desconocido lanza**, `loadBootstrap` propaga y `FUENTE/src/hooks/useAuthSession.ts:34` deja la sesión en estado de error: **ningún** usuario entra. Idéntico efecto en la carga de reservas (`agenda-service.ts:119`). Además `agenda-service.ts:93` deriva nombre corto y acento con un ternario sobre el código. Contradice `FUENTE/docs/ARQUITECTURA.md:179`: incorporación de nuevas salas y unidades **por datos, no por cambios de código**.

**Corrección.** Sustituir la enumeración por cadena no vacía; mover nombre corto y acento a columnas de `agenda_booking_units` o a un mapa con valor por defecto; y descartar filas inválidas en lugar de abortar el lote.

**Prueba de aceptación.** Test de unidad sin base de datos: parsear una fila con código `SALA_HYBRID` mediante el esquema de unidades no debe lanzar. Hoy lanza.

---

### C5 · P1 · Ninguna prueba ejecuta PostgreSQL ni la Edge Function

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D5] Las dos suites de `FUENTE/tests/` leen ficheros como texto y aplican expresiones regulares: `tests/schema.contract.test.ts:19` cuenta sentencias de creación de tabla con un regex, y `tests/edge-function.contract.test.ts:22` comprueba con otro regex que existe un retorno antes de pedir el token. Nunca se abre una conexión ni se levanta el runtime. En consecuencia, **cero de los 14 criterios de base de datos** de `FUENTE/docs/ARQUITECTURA.md:468`–`:481` está verificado, incluidos los tres que definen el producto: dos reservas concurrentes sobre la suite con exactamente una ganadora; rollback sin ocupación parcial; y RLS probada con claves de usuario reales (`ARQUITECTURA.md:481`). El único test de comportamiento es `FUENTE/src/App.test.tsx:22`, y corre íntegramente en modo demostración. Se absorbe aquí la heurística de ventana fija de `tests/schema.contract.test.ts:56`, prueba-proxy que una firma más larga esquiva.

**Por qué esta entrada gobierna a las demás.** C2 es la evidencia de que la laguna no es teórica: un defecto real de la lógica de expansión sobrevivió a la suite entera **porque la suite solo mira texto**. Este es el déficit que impide reincidir; los otros cuatro prioritarios son de horas, este es de días y es el que cambia el régimen.

**Corrección.** Suite de integración con `supabase start` en CI: sembrar dos miembros, ejecutar el alta en dos transacciones solapadas y afirmar 23P01 en exactamente una; afirmar que la suite genera dos ocupaciones; y consultar como `authenticated` de otra organización afirmando cero filas.

**Prueba de aceptación.** `supabase start && supabase db reset`, luego `psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/db/concurrency.sql` debe salir con código 0. Ese fichero no existe hoy.

---

### C6 · P2 · La Edge Function y los tests no se compilan nunca

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D6] `FUENTE/tsconfig.app.json:21` incluye solo `src` y `FUENTE/tsconfig.node.json:16` solo los dos ficheros de configuración, dejando fuera `supabase/functions/` y `tests/`. Como la construcción es compilación más empaquetado (`FUENTE/package.json:11`), un error de tipos en las 313 líneas del worker **atraviesa CI intacto** y solo aparece en el despliegue.

**Corrección.** Añadir a `FUENTE/.github/workflows/ci.yml` un paso de comprobación de tipos con Deno sobre el worker, y un tsconfig adicional que incluya `tests`.

**Prueba de aceptación.** `deno check supabase/functions/sync-google-calendar/index.ts` sale 0 en CI; introducir una asignación de tipo incorrecto en el worker debe hacer fallar el pipeline.

---

### C7 · P2 · El esquema privado sí está expuesto a `authenticated`

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D7] `…init_agenda.sql:1072` concede uso del esquema privado a `authenticated`, y las líneas siguientes conceden ejecución sobre las funciones privilegiadas. `FUENTE/docs/ARQUITECTURA.md:347` exige que vivan en un esquema no expuesto con permisos mínimos, y `FUENTE/docs/OPERACION_Y_DESPLIEGUE.md:19` lo presenta como control efectivo. **No es explotable hoy**, porque las comprobaciones de actor viven dentro de cada función, pero elimina el margen que ese diseño pretendía comprar.

**Corrección.** Convertir los envoltorios públicos en definer con `search_path` cerrado y revocar por completo el uso del esquema privado a `authenticated`, reescribiendo en consecuencia la aserción de `tests/schema.contract.test.ts:56` como lista permitida.

**Prueba de aceptación.** Como usuario autenticado, invocar la función privada directamente debe devolver 42501; invocar el envoltorio público debe seguir funcionando.

---

### C8 · P2 · Horario y granularidad cableados en el frontend pese a ser configurables en base de datos

**Impacto.** [MEDIDO, BLOQUE-B1/§4-D8] `FUENTE/src/domain/schedule.ts:3` congela apertura, cierre, granularidad y duración mínima. La base los guarda por organización (`…init_agenda.sql:17`) y la validación del servidor los lee de la fila (`…init_agenda.sql:506`), pero `loadBootstrap` nunca consulta esa tabla (`FUENTE/src/lib/agenda-service.ts:46`). Si el propietario cierra el parámetro pendiente de `FUENTE/README.md:63` y fija granularidad de 30 minutos, la interfaz seguirá ofreciendo bloques de 15 y el servidor los rechazará: **el usuario recibe errores en opciones que la propia interfaz le presentó**.

**Corrección.** Devolver la fila de organización en el arranque y pasar esos valores a la validación y al generador de opciones horarias, dejando las constantes solo como respaldo del modo demostración.

**Prueba de aceptación.** Con granularidad de 30 minutos en la organización, el generador de opciones devuelve 31 valores y ninguno termina en :15 ni en :45.

---

### C9 · P3 · Worker y cadena de entrega: fugas y detalles

[MEDIDO, BLOQUE-B1/§4-D9 y §3]
- `…sync-google-calendar/index.ts:32` compara el secreto de cron con desigualdad simple, **no en tiempo constante**; es el único control de auth del endpoint. Sustituir por comparación de longitud fija sobre digests.
- `…sync-google-calendar/index.ts:124` devuelve el mensaje de error en el cuerpo del 500. Con la verificación de JWT desactivada (`FUENTE/supabase/config.toml:7`), un llamante anónimo contra una instancia sin secreto configurado recibe literalmente **el nombre del secreto ausente**. Sigue siendo fail-closed, pero informativo.
- `FUENTE/.github/workflows/ci.yml:41` construye la imagen y la descarta sin escaneo ni firma; imágenes fijadas por etiqueta y no por digest (`FUENTE/Dockerfile:14`); los scripts de ciclo de vida sí corren en CI (`ci.yml:28`) aunque el Dockerfile los desactive (`Dockerfile:5`).

**Prueba de aceptación.** Una petición sin cabecera de autorización devuelve Unauthorized o un 500 opaco, nunca un nombre de variable de entorno.

---

### C10 · P3 · Tres desajustes de interfaz

[MEDIDO, BLOQUE-B1/§4-D10]
- **El rol de administrador técnico se rotula como Profesional.** `FUENTE/src/components/AppHeader.tsx:67` decide la etiqueta con una comparación binaria contra coordinador, de modo que el tercer rol —existente en `FUENTE/src/types.ts:1` y en el CHECK de `…init_agenda.sql:97`— se presenta como el de **menor** privilegio. El diálogo de reserva sí lo trata correctamente (`FUENTE/src/components/BookingDialog.tsx:66`): la incoherencia es solo de rótulo, pero afecta al rol con acceso excepcional auditado.
- **La fecha de hoy se congela al montar.** `FUENTE/src/App.tsx:98` memoriza el día actual con dependencias vacías. Una sesión abierta que cruza la medianoche sigue contando las reservas de hoy sobre el día anterior y permite elegir una fecha ya pasada, porque el mínimo del selector procede del mismo valor (`BookingDialog.tsx:166`).
- **El mensaje de «sin reservas» afirma un horizonte que no calcula.** `FUENTE/src/components/RoomStatusCards.tsx:55` promete que no hay reservas hasta la hora de cierre, pero la búsqueda de la siguiente reserva recorre las **dos semanas** cargadas (`FUENTE/src/hooks/useAgenda.ts:41`), no el día en curso.

**Prueba de aceptación.** Renderizar la cabecera con rol de administrador técnico debe mostrar una etiqueta distinta de Profesional.

---

## 5 · Sobreclaims de la documentación

Seis entradas. S7 de B1 no aparece aquí como sobreclaim independiente: se absorbió en **C2**, porque su contra-cita *es* el déficit.

**SC1 · RLS por organización y propiedad.** [MEDIDO]
Cita: `FUENTE/README.md:14` — «RLS por organización y propiedad, con rol de coordinación».
Contra-cita: `…init_agenda.sql:437` — la política de reservas autoriza por pertenencia activa a la organización, **sin predicado de propiedad**. Las 11 políticas son de selección y ninguna comprueba propiedad; esta se verifica en PL/pgSQL (`…init_agenda.sql:671`). No es inseguro —las escrituras no están concedidas— pero describe un mecanismo que no existe. Refuerzo: `FUENTE/docs/ARQUITECTURA.md:345` afirma que las actualizaciones usan USING y WITH CHECK, frente a **cero** políticas de actualización en toda la migración. *(Sin déficit asociado: es defecto de documentación, no de código. Corrección: reescribir la línea, coste minutos.)*

**SC2 · La sincronización con Google figura como alcance implementado.** [MEDIDO]
Cita: `FUENTE/README.md:17` — outbox y Edge Function bajo el epígrafe de alcance implementado.
Contra-cita: `FUENTE/supabase/config.toml:3` — declara que el endpoint lo invoca un planificador que **no está versionado en ninguna parte de FUENTE**. El código del worker existe; el circuito no se cierra. `FUENTE/README.md:25` sí matiza que la sincronización sigue pendiente, pero la lista de alcance no distingue *escrito* de *operativo*. → C3, CT-4.

**SC3 · Horario operativo configurable.** [MEDIDO]
Cita: `FUENTE/README.md:7` — «horario operativo configurable, inicializado en 08:00-23:00».
Contra-cita: `FUENTE/src/domain/schedule.ts:3` — constantes de negocio congeladas en el cliente, sin ninguna lectura de la tabla de organizaciones en `agenda-service.ts:46`. Configurable en el servidor, cableado en el cliente. → C8.

**SC4 · Cabeceras de seguridad.** [MEDIDO]
Cita: `FUENTE/README.md:19` — «imagen Docker Nginx sin privilegios, cabeceras de seguridad, healthcheck y CI».
Contra-cita: `FUENTE/nginx.conf:38` — la directiva de caché dentro del bloque raíz anula la herencia de las siete cabeceras del bloque servidor. → C1. Las otras tres afirmaciones de esa misma línea **sí se cumplen** (`Dockerfile:14`, `Dockerfile:20`, `ci.yml:16`).

**SC5 · Frontend verificado y esquema validado.** [MEDIDO]
Cita: `FUENTE/docs/ARQUITECTURA.md:17` — «estado de validación: frontend verificado; esquema, RLS e índices aplicados».
Contra-cita: `FUENTE/tests/schema.contract.test.ts:34` — la única comprobación de la concurrencia es una coincidencia de texto sobre el fichero SQL. `FUENTE/README.md:55` sí es honesto al llamarlos «contratos estáticos»; el sobreclaim está en ARQUITECTURA.md, que presenta el estado como validado. → C5.

**SC6 · Aplicado y verificado el 7 de agosto de 2026.** [DECLARADO — no auditable]
Cita: `FUENTE/README.md:25` — el esquema base y los índices se aplicaron y verificaron esa fecha en el proyecto designado.
Contra-cita: `FUENTE/supabase/audit/01_postdeploy_verification.sql:1` — el guion de verificación está versionado, pero **su salida no**. No hay bajo FUENTE ningún log, resultado ni adjunto de CI que respalde la ejecución ni la fecha. Puede ser cierto; no es auditable. Igual ocurre con `FUENTE/docs/OPERACION_Y_DESPLIEGUE.md:7`, que enumera siete controles como completados. → Q2, abierta.

---

## 6 · Preguntas de handoff: cerradas y abiertas

B1 dirigió sus cuatro preguntas a un bloque **B2 que no existe en este paquete**. Se responden con lo que hay o se declaran abiertas.

| # | Pregunta (BLOQUE-B1/§HANDOFF-Preguntas) | Estado |
|---|---|---|
| Q1 | ¿Existe fuera del bloque algún planificador (pg_cron, n8n, workflow externo) que invoque `sync-google-calendar`? | **ABIERTA.** No hay otro bloque que pueda responder. Dentro de B1 la respuesta es no (`config.toml:3` + barrido). El circuito de integración se declara no cerrado *a nivel de este paquete*; a nivel de sistema, indeterminado. |
| Q2 | ¿Consta en algún lugar la salida de `supabase/audit/01_postdeploy_verification.sql`, que permita elevar SC6 de DECLARADO a MEDIDO? | **ABIERTA.** Ningún bloque aporta la salida. SC6 permanece [DECLARADO]. |
| Q3 | ¿Hay algún proceso operativo que marque salas como inactivas o no reservables? | **ABIERTA — y es la pregunta cara.** De ella depende que C2 suba de P1 a P0. Ningún bloque la responde. |
| Q4 | ¿Existe `obra/DOSSIER-VIGENTE.md` y puede exponerse como dato? | **CERRADA.** BLOQUE-B1/§preámbulo-Contexto: «No existe `obra/` ni `obra/DOSSIER-VIGENTE.md`. Ambos candidatos coinciden en esa ausencia». **Este documento es el primer dossier vigente**; a partir de aquí sí hay consolidado que no duplicar. |

**Interfaces prometidas.** BLOQUE-B1/§HANDOFF-Interfaces compromete hacia B2: (a) el contrato de datos estable del frontend —RPC públicas de alta, cancelación y reprogramación; vistas `agenda_booking_calendar` y `agenda_booking_unit_directory`; gate fail-closed de `src/lib/env.ts`—; y (b) que las citas son estables a nivel de línea y los diez déficits reverificables sin releer el código. **Ambas quedan entregadas a este dossier en lugar de a B2**, y (b) se cumple: las 64 citas de B1 se transportan íntegras aquí. Con la salvedad de que la vista `agenda_booking_unit_directory` se entrega **defectuosa** por C2 (une `agenda_rooms` sin filtrar `is_active`): la interfaz prometida como estable contiene un defecto conocido y declarado por el mismo bloque que la promete.

---

## 7 · Contradicciones nombradas

**CT-1 · Destinatario inexistente.** B1 dirige 2 interfaces y 4 preguntas a **B2**; en `FUENTE/BLOQUES/` no hay INFORME-B2 ni HANDOFF-B2. No es incumplimiento de B1 —es un hueco del paquete— pero **tres de sus cuatro preguntas quedan sin cerrar**, y una de ellas (Q3) determina la severidad de C2. *Consecuencia: la prioridad de C2 es provisional.*

**CT-2 · Severidad inconsistente dentro de B1.** Dos hallazgos aparecen con prioridad distinta en el cuerpo y en el handoff del mismo informe: (a) el tope de reintentos del outbox es *agravante de un déficit P1* en §4-D3 y **P2** en `HANDOFF-B1.json`; (b) `directorio-ignora-sala-inactiva` es parte integral del déficit **P1** D2 en §4 y **P2** suelto en el handoff. **Resolución adoptada:** ambos se consolidan dentro de su déficit padre (C3, C2) y heredan **P1**, porque en el cuerpo del informe B1 los presenta como el mecanismo que hace real el daño, no como incidencias separadas.

**CT-3 · «El código del worker existe y es correcto» vs. «el worker no se compila nunca».** SC2 (BLOQUE-B1/§5) califica el worker de correcto; C6 (§4-D6) establece que sus 313 líneas **nunca pasan por compilador ni `deno check`**, y C5 que ninguna prueba levanta su runtime. «Correcto» es aquí un juicio de lectura, no un resultado. *Este dossier degrada esa calificación a [INFERIDO].*

**CT-4 · Contradicción interna de la documentación original.** `FUENTE/README.md:17` lista la sincronización con Google bajo alcance **implementado**; `FUENTE/README.md:25` la declara **pendiente**. Los dos textos son del mismo fichero. Reportado por B1 en SC2; se nombra aquí como contradicción del material, no del auditor.

**CT-5 · Cobertura de auditoría no replicada — la contradicción de proceso de esta ronda.** BLOQUE-B1/§7 registra que el candidato `glm` declaró, por segunda ronda consecutiva, no haber recibido el paquete FUENTE/ y entregó cero hallazgos y métricas en cero; B1 adoptó las métricas de `claude` (50 ficheros, 6829 LOC, 64 citas) y descartó las de `glm` por erróneas. En esta ronda 1 de consolidación **se repite exactamente el mismo patrón**: el candidato `glm` declara «cero INFORME-*.md y cero HANDOFF-*.json entregados a este agente», mientras el candidato `claude` lee y cita ese mismo paquete. Las dos declaraciones no pueden ser ambas ciertas sobre el mismo árbol: es una contradicción entre candidatos, y se resuelve por evidencia —el lado que aporta citas resolubles a fichero y línea prevalece sobre el lado que no aporta ninguna. **Efecto sobre este dossier: todo su contenido descansa en una única lectura, sin verificación independiente.** No es un defecto del producto auditado, sino del proceso de auditoría, y es el mayor riesgo de este documento. Se declara explícitamente en lugar de disimularse. Detalle en §10.

---

## 8 · Qué falta para producción y retorno de arreglarlo

Orden por relación coste/beneficio (costes según BLOQUE-B1/§6, [INFERIDO] por estimación del auditor, no medidos):

| # | Déficit | Coste estimado | Retorno |
|---|---|---|---|
| 1 | **C1** — cuatro `include` en `nginx.conf` | ~15 min | Restaura de golpe todo el estrato de defensa del navegador, hoy pagado en documentación y no cobrado en ejecución. Mejor relación esfuerzo/riesgo del bloque. |
| 2 | **C2** — comparación de conteo en lugar de contra-cero, más el filtro en la vista | ~1 h | Convierte la suite indivisible de promesa documental en invariante de base de datos, al mismo nivel que ya está la exclusión anti-solape. |
| 3 | **C4** — sustituir dos enumeraciones cerradas | ~1 h | Elimina un modo de fallo **total** desencadenable por una operación de datos rutinaria. |
| 4 | **C3** — planificador versionado y tope de reintentos | ~½ día | Convierte el espejo de Google de código escrito en función entregada: la mitad visible del valor prometido en `ARQUITECTURA.md:356`. |
| 5 | **C5** — suite de integración contra Postgres local | 1–2 días | **El mayor.** C2 demuestra que sin ella los defectos de la lógica transaccional pasan desapercibidos; además cierra el requisito explícito de `ARQUITECTURA.md:481`. |

Cuatro de los cinco son de horas; el quinto, el único que evita reincidir, es de días.

**Fuera de alcance, declarado explícitamente por B1 y no cubierto por ningún otro bloque:** configuración del proveedor Google en el panel de Supabase; secretos del worker; DNS y TLS del subdominio; fichero y licencia web de Just Sans (`FUENTE/README.md:84`); másters vectoriales del logotipo; repositorio de la web comercial; y el estado real del proyecto Supabase remoto.

**Juicio consolidado.** El diseño de datos es sólido y está del lado correcto de la frontera cliente/servidor: exclusión en la base, escrituras solo por RPC transaccional, cancelación lógica con auditoría, fail-closed en las tres capas y cero secretos en el árbol. Lo que falla es **el cierre**, y falla con un patrón único: *la capa de entrega anula sus propias cabeceras (C1); el circuito de integración no tiene quien lo dispare (C3); el segundo invariante del dominio se dejó sin constraint (C2); y el conjunto de pruebas comprueba que el código **dice** lo correcto en lugar de que **haga** lo correcto (C5)*. Los sobreclaims de la documentación no son adorno: son exactamente el hueco entre lo escrito y lo cerrado, y cada uno de los seis apunta a un déficit de esa lista.

---

## 9 · Huecos declarados de este dossier

1. **Ninguna prueba de aceptación ejecutada.** Todo [MEDIDO] es lectura. La semántica de herencia de nginx que sostiene el único P0 es [INFERIDO].
2. **Un solo bloque, un solo auditor efectivo** (CT-5, §10). Sin segunda lectura independiente ni contraste entre bloques.
3. **Tres preguntas abiertas** (Q1, Q2, Q3), una de las cuales condiciona la severidad de C2.
4. **Cero observación del sistema desplegado**: proyecto Supabase remoto, secretos, DNS/TLS y proveedor Google no observados por nadie.
5. **Métricas transportadas de BLOQUE-B1/§Métricas**, no recomputadas aquí: LOC 6829, ficheros 50, citas verificadas 64.

---

## 10 · Anexo: aportación del candidato `glm` en esta ronda

Se registra por transparencia y para conservar lo aprovechable, sin promoverla a hallazgo sobre el sistema.

**Lo que declaró `glm`.** Estado «BLOQUEADO — ENTRADA VACÍA», con esta afirmación como núcleo: «En mi contexto de ejecución no consta ningún documento de FUENTE/BLOQUES/: cero INFORME-*.md y cero HANDOFF-*.json entregados a este agente [MEDIDO]». Coherente con esa premisa, marcó las seis secciones del encargo como ABIERTA («Sin bloques que citar»), declaró «Preguntas de handoff: 0 cerradas; total desconocido (no legibles)» y «CONTRADICCIONES entre bloques (promesas incumplidas): 0 nombradas; total desconocido», y cerró con «Se emiten 0 ítems P0 en esta ronda; emitir alguno sería inventarlo».

**Lo que se conserva, porque es correcto.** La política anti-fabricación que invoca —«Emitir las secciones 1–6 con citas inventadas sería fabricación, no consolidación, y contaminaría el consenso desde la ronda 1»— es la conducta adecuada bajo su premisa, y este documento la suscribe: es la misma regla que aquí obliga a declarar los cinco huecos de §9 en lugar de rellenarlos. Se conserva también su distinción, útil para el protocolo, entre «conjunto vacío» y «conjunto no entregado a este agente», y su criterio de desbloqueo verificable: «en la ronda siguiente con insumos presentes, el nuevo dossier debe llevar ≥1 cita reproducida en cada una de las secciones 1–6» — criterio que esta síntesis cumple en las seis.

**Lo que no se adopta, y por qué.** (a) La premisa de entrada vacía no se propaga: el paquete de esta ronda contiene `FUENTE/BLOQUES/INFORME-B1.md` y `FUENTE/BLOQUES/HANDOFF-B1.json`, leídos y citados a nivel de línea por el candidato `claude`; la discrepancia es de distribución por agente, no del bloque. (b) No se incorporan sus métricas en cero, porque introducirían un inventario erróneo del bloque núcleo. (c) No se acata su cláusula «el consolidador de ronda siguiente no debe extraer de aquí ningún hallazgo sobre MUVVITAL-AGENDA» como norma general: se aplica solo a su propio documento, que efectivamente no contiene ninguno, y no puede restringir la extracción de hallazgos de otras fuentes. (d) Su única prueba de aceptación —«ninguna línea de este dossier contiene una cita con formato BLOQUE-<id>/§sección ni FUENTE/ruta:línea»— no discrimina entre no fabricar y no trabajar: la pasa cualquier documento vacío. Este dossier la sustituye por la prueba positiva del propio `glm`: ≥1 cita resoluble por sección.

**Consecuencia para la ronda siguiente.** El riesgo mayor de este documento no está en su contenido sino en su origen único (§9.2). El desbloqueo que `glm` pide —volcado literal de cada INFORME-*.md y de cada HANDOFF-*.json, más declaración del número de bloques esperado— es exactamente lo que permitiría una segunda lectura independiente y convertiría CT-5 en incidencia cerrada.

---

## HANDOFF (dossier vigente R1)

| ID consolidado | Sev. global | Cita ancla | Fuente |
|---|---|---|---|
| `C1-nginx-headers-inertes` | **P0** | `FUENTE/nginx.conf:38` | BLOQUE-B1/§4-D1, §5-S4 |
| `C2-suite-no-atomica-y-directorio-mentiroso` | **P1** (→P0 si Q3 es afirmativa) | `…init_agenda.sql:616` + `:987` | BLOQUE-B1/§4-D2, §5-S7 |
| `C3-outbox-sin-planificador-ni-tope` | **P1** | `FUENTE/supabase/config.toml:3` + `…init_agenda.sql:945` | BLOQUE-B1/§2.3, §4-D3, §5-S2 |
| `C4-enum-cerrada-rompe-la-app` | **P1** | `FUENTE/src/lib/agenda-service.ts:18` | BLOQUE-B1/§4-D4 |
| `C5-cero-pruebas-de-ejecucion` | **P1** | `FUENTE/tests/schema.contract.test.ts:19` | BLOQUE-B1/§4-D5, §5-S5 |
| `C6-worker-y-tests-sin-typecheck` | P2 | `FUENTE/tsconfig.app.json:21` | BLOQUE-B1/§4-D6, §3 |
| `C7-esquema-privado-expuesto` | P2 | `…init_agenda.sql:1072` | BLOQUE-B1/§4-D7, §3 |
| `C8-horario-cableado-en-cliente` | P2 | `FUENTE/src/domain/schedule.ts:3` | BLOQUE-B1/§4-D8, §5-S3 |
| `C9-worker-y-entrega-detalles` | P3 | `…sync-google-calendar/index.ts:32` y `:124` | BLOQUE-B1/§4-D9, §3 |
| `C10-desajustes-de-interfaz` | P3 | `FUENTE/src/components/AppHeader.tsx:67` | BLOQUE-B1/§4-D10 |
| `SC1-rls-por-propiedad-inexistente` | P3 (solo doc) | `FUENTE/README.md:14` vs `…init_agenda.sql:437` | BLOQUE-B1/§5-S1 |
| `SC6-verificacion-postdeploy-sin-salida` | P3 (no auditable) | `FUENTE/supabase/audit/01_postdeploy_verification.sql:1` | BLOQUE-B1/§5-S6 |

### Preguntas que siguen abiertas para la próxima ronda
- Q1 · ¿Existe algún planificador fuera del bloque que invoque `sync-google-calendar`?
- Q2 · ¿Consta la salida de `01_postdeploy_verification.sql` sobre el proyecto designado?
- Q3 · ¿Hay proceso operativo que marque salas inactivas o no reservables? **Determina si C2 es P0.**
- Q5 (nueva, de proceso) · ¿Se entregará el paquete FUENTE/ a todos los agentes de la ronda siguiente, para obtener la segunda lectura independiente que CT-5 declara ausente?

### Métricas
- Candidatos fusionados: 2 (`claude` con contenido sustantivo, `glm` con entrega nula registrada en §10)
- Bloques consolidados: 1 · Informes de entrada: 1 · Hallazgos de entrada: 22 (10 déficits + 12 handoff) → **10 consolidados + 2 doc-only**
- Preguntas de entrada: 4 → 1 cerrada, 3 abiertas (+1 nueva de proceso) · Contradicciones nombradas: 5
- LOC / ficheros / citas verificadas (transportadas de B1): 6829 / 50 / 64

