# RHA

Registro de Hábitos y Agenda: la fase 3 del ecosistema SIVA. App propia (repo, Vercel, PWA) que comparte con FIA, GYM y SIVA el proyecto de Supabase y la cuenta.

- **Hoy**: anillos de hábitos y actividades del día, agenda (con y sin horario), hábitos para marcar, vencidas y próximos días.
- **Semana**: calendario de lunes a domingo, navegable.
- **Agenda**: lista vertical desde hoy; las tareas sin horario van en su bloque de cada día. Filtro por categoría.
- **Hábitos**: días fijos o N veces por semana; completado, parcial o no completado; rachas; pausa (no cuenta incumplimientos); archivo. Los suplementos se marcan con «Lo tomé». La primera vez se eligen de una lista armada con la rutina del usuario.
- **Vencidos**: lo pendiente con fecha pasada. Nunca se reprograma solo: se propone un día y se decide.
- **Panel**: adherencia (siempre con denominador), actividades completadas/pendientes/vencidas/canceladas, tiempo planificado por categoría y rachas.
- **Ajustes**: notificaciones, horarios de los resúmenes, categorías y tema.
- **Notificaciones push** a la hora de actividades, hábitos y suplementos, resumen del día y resumen del domingo 21:00.

## Cómo está armado

- `src/lib/habitos.ts`, `src/lib/agenda.ts`, `src/lib/avisos.ts`: la lógica, código puro con pruebas (`src/lib/rha.test.ts`).
- `src/lib/rha.tsx`: el estado de la app; guarda al instante y reintenta lo que falló (ids generados en la app: sin duplicados).
- `src/app/api/avisos`: la ruta que manda las notificaciones. La llama la base cada minuto (pg_cron) con un secreto; cada aviso tiene una clave y se manda una sola vez.
- `public/sw.js`: el service worker que muestra las notificaciones.
- `supabase/schema.sql`: tablas `rha_*`, permisos (RLS) y auditoría. `supabase/avisos.sql`: el disparador de cada minuto.
- `docs/CONTRATO.md`: qué datos expone RHA a SIVA, GYM y CIA.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000/demo abre la app con datos de muestra
npm test
```

## Puesta en marcha

1. **Base**: Supabase → SQL Editor → pegar `supabase/schema.sql` → Run.
2. **Vercel**: importar el repo. En *Settings → Environment Variables* cargar (solo ahí, nunca en el repo):
   - `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → *secret key*.
   - `VAPID_PRIVATE_KEY`: la clave privada de notificaciones (la pública está en `.env`).
   - `AVISOS_SECRETO`: una contraseña larga cualquiera; la usa la base para llamar a la app.
   Después, *Redeploy*.
3. **Disparador**: en `supabase/avisos.sql` reemplazar `TU-DIRECCION` y `TU-SECRETO`, pegarlo en el SQL Editor y correrlo.
4. **iPhone**: abrir la app en Safari → Compartir → Agregar a pantalla de inicio → abrirla desde el ícono → Ajustes → Activar notificaciones → Probar.

## Límites conocidos

- En iPhone las notificaciones necesitan iOS 16.4 o más y la app instalada en la pantalla de inicio.
- Los avisos salen dentro del minuto (el disparador corre cada minuto); si la base se atrasa, se recuperan hasta 10 minutos tarde, nunca duplicados.
- La relación con GYM (entrenamientos planificados) y CIA (bloques de estudio) está preparada en la base (`origen`, `origen_ref`) pero se conecta en sus fases.
