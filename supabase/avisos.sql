-- RHA · disparador de notificaciones
-- Cada minuto, la base le pide a la app que mande los avisos que correspondan.
-- Se corre UNA vez, después de publicar RHA en Vercel y de cargar AVISOS_SECRETO allá.
--
-- Antes de pegar, reemplazá:
--   TU-DIRECCION   → la dirección de RHA en Vercel (ej.: rha-xxxx.vercel.app, sin https://)
--   TU-SECRETO     → el mismo valor que pusiste en AVISOS_SECRETO en Vercel
--
-- Se puede correr más de una vez: reemplaza la tarea anterior.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('rha-avisos') where exists (select 1 from cron.job where jobname = 'rha-avisos');

select cron.schedule(
  'rha-avisos',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://TU-DIRECCION/api/avisos',
    headers := jsonb_build_object('Authorization', 'Bearer TU-SECRETO', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Para ver si está andando (las últimas llamadas y su resultado):
--   select status_code, content, created from net._http_response order by created desc limit 5;
-- Para apagarlo:
--   select cron.unschedule('rha-avisos');
