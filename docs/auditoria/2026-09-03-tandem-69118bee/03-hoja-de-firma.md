# HOJA DE FIRMA · MUVVITAL-AGENDA · run 69118bee

**Qué firmas.** El dossier de consenso (documento 02) es el resultado de un módulo auditado por trío multi-agente con juez independiente (DeepSeek, Condición A) y consolidado con embudo declarado. Tu papel es leer y decidir; el sistema ya localizó, citó y priorizó.

**Techo de confianza heredado (léelo antes de firmar).** Ningún [MEDIDO] procede de ejecución: el bloque no pudo instalar dependencias ni ejecutar `npm test`, `tsc` ni `docker build`. Todo [MEDIDO] significa *leído en la línea citada*. Las pruebas de aceptación son comandos propuestos, no resultados.

**Garantía multi-agente en la consolidación.** El candidato `glm` declaró «entrada vacía» en la ronda de consolidación (anexo §10 del dossier): la síntesis final descansa en el candidato `claude` sobre el informe sellado B1, que sí tuvo tres agentes y juez. Queda registrado como CT-5 y como incidencia del producto en investigación.

## Déficits consolidados — decisión por línea

| # | Prioridad | Déficit | Decisión |
|---|---|---|---|
| C1 | P0 | Nginx descarta todas las cabeceras de seguridad en el 100 % de las respuestas | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C2 | P1 | La suite indivisible se reserva a medias, en silencio, y la interfaz lo oculta | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C3 | P1 | El outbox nunca se drena, y los fallos se reclaman para siempre | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C4 | P1 | Un dato nuevo rompe la aplicación entera, no solo la unidad nueva | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C5 | P1 | Ninguna prueba ejecuta PostgreSQL ni la Edge Function | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C6 | P2 | La Edge Function y los tests no se compilan nunca | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C7 | P2 | El esquema privado sí está expuesto a `authenticated` | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C8 | P2 | Horario y granularidad cableados en el frontend pese a ser configurables en base de datos | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C9 | P3 | Worker y cadena de entrega: fugas y detalles | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |
| C10 | P3 | Tres desajustes de interfaz | ☐ Acepto · ☐ Rechazo · ☐ Pospongo |

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


## Firma

Nombre: ____________________________ · Fecha: ____ / ____ / 2026

☐ Acepto el dossier como diagnóstico de MUVVITAL-AGENDA@1ecfd97ec12c y encargo la corrección de los P0/P1 marcados.
☐ Devuelvo con observaciones (anótalas al margen).
