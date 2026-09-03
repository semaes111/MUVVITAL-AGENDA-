# INFORME EJECUTIVO · MUVVITAL-AGENDA

**Objeto.** Auditoría integral de `https://github.com/semaes111/MUVVITAL-AGENDA-` @ `1ecfd97ec12c` (repo privado, clonado con token de solo lectura). Run TÁNDEM **69118bee**, 3 de septiembre de 2026.

**Método.** Dossier por bloques con consolidación incremental: el material (50 ficheros, 6.829 LOC sin lockfile) cupo en **un módulo** (4.535 LOC medibles). El módulo pasó por un ciclo trío completo (Claude Code · Codex · glm, cierre por quórum, juez independiente DeepSeek bajo Condición A) y convergió en **segunda ronda**; la consolidación convergió en primera ronda. Coste api: céntimos; CLIs por suscripción.

**Resultado en una frase.** El diseño de datos hace lo difícil bien —PostgreSQL como única autoridad de disponibilidad, exclusión anti-solape por sala, escrituras fail-closed solo vía RPC— y las tres capas que lo rodean (entrega, integración, pruebas) no rematan: cabeceras de seguridad inertes (P0), suite indivisible reservable a medias (P0), worker de Google Calendar que nadie invoca (no comisionado y no declarado), y una aplicación que se vuelve inaccesible ante un valor nuevo en base de datos.

**Cifras del embudo.** 10 déficits + 12 hallazgos + 7 sobreclaims + 4 preguntas + 2 interfaces → **10 déficits consolidados (C1–C10)**, **6 sobreclaims**, **5 contradicciones nombradas**, 1 pregunta cerrada de 4, huecos declarados (§9).

**Déficits por prioridad.**
- **C1 · P0** · Nginx descarta todas las cabeceras de seguridad en el 100 % de las respuestas
- **C2 · P1** · La suite indivisible se reserva a medias, en silencio, y la interfaz lo oculta
- **C3 · P1** · El outbox nunca se drena, y los fallos se reclaman para siempre
- **C4 · P1** · Un dato nuevo rompe la aplicación entera, no solo la unidad nueva
- **C5 · P1** · Ninguna prueba ejecuta PostgreSQL ni la Edge Function
- **C6 · P2** · La Edge Function y los tests no se compilan nunca
- **C7 · P2** · El esquema privado sí está expuesto a `authenticated`
- **C8 · P2** · Horario y granularidad cableados en el frontend pese a ser configurables en base de datos
- **C9 · P3** · Worker y cadena de entrega: fugas y detalles
- **C10 · P3** · Tres desajustes de interfaz

**Lo que este dossier NO es.** Ninguna prueba se ejecutó (techo de confianza heredado, declarado en cabecera); el estado del proyecto Supabase remoto, el proveedor Google, los secretos del worker y DNS/TLS no se observaron. Son huecos con nombre, no omisiones.

**Siguiente paso.** Firmar la hoja (documento 03) por línea: aceptar, rechazar o posponer cada déficit. Con la firma, el equipo tiene el orden de trabajo y las pruebas de aceptación propuestas para cada corrección.
