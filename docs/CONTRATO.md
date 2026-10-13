# Contrato de datos de RHA

RHA es dueño de la agenda, los hábitos y sus registros (especificación maestra, 3.4 y 9). Este documento dice qué expone y cómo se cuenta, para que SIVA lo muestre y GYM, CIA y AICA se integren sin duplicar datos.

## Tablas

En `public`, con RLS: cada usuario autenticado ve y modifica solo lo suyo. `fecha` es día local (Argentina); `inicio`/`fin` son horas locales.

| Tabla | Qué guarda |
|---|---|
| `rha_actividades` | Actividad (con `inicio`) o tarea sin horario. `estado`: pendiente, completada, cancelada. `prioridad`, `categoria_id`, `recordatorio` (minutos antes), `serie_id` (repetición semanal), `origen` + `origen_ref` |
| `rha_habitos` | `tipo` `dias` (días 1 = lunes … 7 = domingo) o `semanal` (`meta_semanal` veces). `estado`: activo, pausado, archivado. `suplemento`, `hora` del recordatorio, `desde` |
| `rha_registros` | Un registro por hábito y día: completado, parcial o no_completado |
| `rha_pausas` | Períodos en pausa de un hábito (`hasta` = día en que se retomó, no incluido) |
| `rha_categorias` | Nombre y color |
| `rha_ajustes`, `rha_suscripciones`, `rha_avisos_enviados`, `rha_auditoria` | Configuración, dispositivos con notificaciones, avisos ya mandados e historial de cambios |

## Definiciones

- **Vencida**: actividad `pendiente` con `fecha` anterior a hoy. No se reprograma sola.
- **Programado**: un hábito de días fijos se espera en sus días, desde `desde`, salvo en pausa o archivado. Uno semanal, cualquier día de la semana (lunes a domingo).
- **Adherencia** (días fijos): completados / días programados del período. Los días futuros no cuentan; hoy, solo si ya tiene registro. Los parciales se informan aparte (no suman como completados). Siempre se muestra el denominador.
- **Meta semanal**: registros `completado` en la semana ≥ `meta_semanal`.
- **Racha**: días programados seguidos completados (o semanas seguidas con la meta cumplida). Hoy sin marcar no corta; las pausas se saltean.
- **Tiempo planificado**: suma de bloques con inicio y fin, sin canceladas. No es tiempo real trabajado.

Las fórmulas están en `src/lib/habitos.ts` y `src/lib/agenda.ts`, con pruebas.

## Para consumidores e integraciones

- **SIVA**: lee con la sesión del usuario. Si la lectura falla, muestra RHA como "no disponible", nunca como "sin actividades".
- **GYM / CIA** (cuando se integren): crean o actualizan compromisos en `rha_actividades` con `origen` (`gym` o `cia`) y un `origen_ref` estable; el índice único `(usuario_id, origen, origen_ref)` evita duplicados. Una sesión planificada en RHA no es una sesión hecha en GYM. Cambiar un compromiso futuro no toca los pasados.
- **AICA**: crea o edita solo con instrucción explícita y a través de las mismas reglas.
