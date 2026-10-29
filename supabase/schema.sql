-- RHA · esquema de la base de datos
-- Todas las tablas empiezan con rha_. Pegar completo en Supabase → SQL Editor → Run.
-- Se puede correr más de una vez sin romper nada.

-- ───────────────────────── Ajustes ─────────────────────────
create table if not exists public.rha_ajustes (
  usuario_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  hora_tareas time not null default '09:00',
  resumen_diario boolean not null default true,
  hora_resumen time not null default '08:00',
  resumen_semanal boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ──────────────────────── Categorías ───────────────────────
create table if not exists public.rha_categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  orden smallint not null default 0,
  creado_en timestamptz not null default now()
);

create unique index if not exists rha_categorias_nombre on public.rha_categorias (usuario_id, lower(nombre));

-- ──────────────────────── Actividades ──────────────────────
-- Con hora de inicio es una actividad con horario; sin hora, una tarea del día.
create table if not exists public.rha_actividades (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 160),
  fecha date not null,
  inicio time,
  fin time,
  categoria_id uuid references public.rha_categorias (id) on delete set null,
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'completada', 'cancelada')),
  notas text not null default '' check (char_length(notas) <= 2000),
  recordatorio smallint check (recordatorio between 0 and 1440),
  serie_id uuid,
  -- Para cuando otra app cree compromisos acá: de dónde vino y su id allá.
  origen text not null default 'manual' check (origen in ('manual', 'gym', 'cia', 'aica')),
  origen_ref text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fin is null or inicio is not null),
  check (fin is null or fin > inicio)
);

create index if not exists rha_actividades_usuario_fecha on public.rha_actividades (usuario_id, fecha);
create unique index if not exists rha_actividades_origen on public.rha_actividades (usuario_id, origen, origen_ref) where origen_ref is not null;

-- ───────────────────────── Hábitos ─────────────────────────
create table if not exists public.rha_habitos (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  tipo text not null check (tipo in ('dias', 'semanal')),
  dias smallint[] not null default '{}',
  meta_semanal smallint check (meta_semanal between 1 and 7),
  categoria_id uuid references public.rha_categorias (id) on delete set null,
  suplemento boolean not null default false,
  hora time,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'archivado')),
  desde date not null,
  orden smallint not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (dias <@ '{1,2,3,4,5,6,7}'::smallint[]),
  check ((tipo = 'dias' and cardinality(dias) > 0) or (tipo = 'semanal' and meta_semanal is not null))
);

create index if not exists rha_habitos_usuario on public.rha_habitos (usuario_id);

-- Hábitos que llevan un número al marcarlos (por ahora, el peso en kilos).
alter table public.rha_habitos add column if not exists medicion text check (medicion in ('peso'));

-- Mientras dura una pausa no se cuentan incumplimientos. "hasta" es el día en que se retomó.
create table if not exists public.rha_pausas (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habito_id uuid not null references public.rha_habitos (id) on delete cascade,
  desde date not null,
  hasta date,
  check (hasta is null or hasta >= desde)
);

create index if not exists rha_pausas_habito on public.rha_pausas (habito_id);

-- Un registro por hábito y día: el historial diario se conserva.
create table if not exists public.rha_registros (
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habito_id uuid not null references public.rha_habitos (id) on delete cascade,
  fecha date not null,
  estado text not null check (estado in ('completado', 'parcial', 'no_completado')),
  nota text not null default '' check (char_length(nota) <= 500),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (habito_id, fecha)
);

create index if not exists rha_registros_usuario_fecha on public.rha_registros (usuario_id, fecha);

alter table public.rha_registros add column if not exists valor numeric(6, 2) check (valor > 0 and valor < 1000);

-- ──────────────────────── Notificaciones ───────────────────
-- Un teléfono o compu donde el usuario activó las notificaciones.
create table if not exists public.rha_suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text not null default '',
  creado_en timestamptz not null default now()
);

-- Lo que ya se mandó, para no repetir aunque el servidor reintente. Solo lo escribe el servidor.
create table if not exists public.rha_avisos_enviados (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  clave text not null,
  enviado_en timestamptz not null default now(),
  primary key (usuario_id, clave)
);

-- ──────────────────────── Auditoría ────────────────────────
-- La escribe la base sola: cambios y borrados de actividades, y de registros de días pasados.
create table if not exists public.rha_auditoria (
  id bigint generated always as identity primary key,
  usuario_id uuid not null,
  entidad text not null,
  entidad_id text not null,
  accion text not null,
  cambios jsonb not null default '{}'::jsonb,
  fecha timestamptz not null default now()
);

create or replace function public.rha_tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create or replace function public.rha_auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  diferencias jsonb;
  entidad text := case tg_table_name when 'rha_actividades' then 'actividad' when 'rha_habitos' then 'habito' else 'registro' end;
  id_texto text;
begin
  if tg_op = 'DELETE' then
    id_texto := coalesce(to_jsonb(old) ->> 'id', (to_jsonb(old) ->> 'habito_id') || ':' || (to_jsonb(old) ->> 'fecha'));
    insert into public.rha_auditoria (usuario_id, entidad, entidad_id, accion, cambios)
    values (old.usuario_id, entidad, id_texto, 'borrado', to_jsonb(old));
    return null;
  end if;

  -- Los registros no tienen id propio: se identifican por hábito y día.
  id_texto := coalesce(to_jsonb(new) ->> 'id', (to_jsonb(new) ->> 'habito_id') || ':' || (to_jsonb(new) ->> 'fecha'));
  select coalesce(jsonb_object_agg(d.key, jsonb_build_object('antes', a.value, 'despues', d.value)), '{}'::jsonb)
  into diferencias
  from jsonb_each(to_jsonb(new)) as d
  join jsonb_each(to_jsonb(old)) as a on a.key = d.key
  where d.value is distinct from a.value
    and d.key <> 'actualizado_en';

  if diferencias <> '{}'::jsonb then
    insert into public.rha_auditoria (usuario_id, entidad, entidad_id, accion, cambios)
    values (new.usuario_id, entidad, id_texto, 'edicion', diferencias);
  end if;
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['rha_ajustes', 'rha_actividades', 'rha_habitos', 'rha_registros'] loop
    execute format('drop trigger if exists %1$s_tocar on public.%1$s', t);
    execute format('create trigger %1$s_tocar before update on public.%1$s for each row execute function public.rha_tocar_actualizado()', t);
  end loop;
end;
$$;

drop trigger if exists rha_actividades_auditar on public.rha_actividades;
create trigger rha_actividades_auditar after update or delete on public.rha_actividades
  for each row execute function public.rha_auditar();

drop trigger if exists rha_habitos_auditar on public.rha_habitos;
create trigger rha_habitos_auditar after update or delete on public.rha_habitos
  for each row execute function public.rha_auditar();

-- Los registros de hoy cambian a cada toque; se audita cuando se toca un día que ya pasó.
drop trigger if exists rha_registros_auditar on public.rha_registros;
create trigger rha_registros_auditar after update or delete on public.rha_registros
  for each row when (old.fecha < current_date - 1)
  execute function public.rha_auditar();

-- ───────────────────────── Permisos ────────────────────────
do $$
declare t text;
begin
  foreach t in array array['rha_ajustes', 'rha_categorias', 'rha_actividades', 'rha_habitos', 'rha_pausas', 'rha_registros', 'rha_suscripciones', 'rha_avisos_enviados', 'rha_auditoria'] loop
    execute format('alter table public.%s enable row level security', t);
  end loop;
  foreach t in array array['rha_ajustes', 'rha_categorias', 'rha_actividades', 'rha_habitos', 'rha_pausas', 'rha_registros', 'rha_suscripciones'] loop
    execute format('drop policy if exists %1$s_propio on public.%1$s', t);
    execute format('create policy %1$s_propio on public.%1$s for all to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Las referencias (categoría, hábito) tienen que ser del mismo usuario.
drop policy if exists rha_actividades_propio on public.rha_actividades;
create policy rha_actividades_propio on public.rha_actividades for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id = (select auth.uid())
    and (categoria_id is null or exists (select 1 from public.rha_categorias c where c.id = categoria_id and c.usuario_id = (select auth.uid())))
  );

drop policy if exists rha_habitos_propio on public.rha_habitos;
create policy rha_habitos_propio on public.rha_habitos for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id = (select auth.uid())
    and (categoria_id is null or exists (select 1 from public.rha_categorias c where c.id = categoria_id and c.usuario_id = (select auth.uid())))
  );

drop policy if exists rha_registros_propio on public.rha_registros;
create policy rha_registros_propio on public.rha_registros for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and exists (select 1 from public.rha_habitos h where h.id = habito_id and h.usuario_id = (select auth.uid())));

drop policy if exists rha_pausas_propio on public.rha_pausas;
create policy rha_pausas_propio on public.rha_pausas for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and exists (select 1 from public.rha_habitos h where h.id = habito_id and h.usuario_id = (select auth.uid())));

drop policy if exists rha_auditoria_ver on public.rha_auditoria;
create policy rha_auditoria_ver on public.rha_auditoria for select to authenticated using (usuario_id = (select auth.uid()));

drop policy if exists rha_avisos_ver on public.rha_avisos_enviados;
create policy rha_avisos_ver on public.rha_avisos_enviados for select to authenticated using (usuario_id = (select auth.uid()));

revoke all on public.rha_ajustes, public.rha_categorias, public.rha_actividades, public.rha_habitos, public.rha_pausas,
  public.rha_registros, public.rha_suscripciones, public.rha_avisos_enviados, public.rha_auditoria from anon, authenticated;
grant select, insert, update on public.rha_ajustes to authenticated;
grant select, insert, update, delete on public.rha_categorias, public.rha_actividades, public.rha_habitos, public.rha_pausas,
  public.rha_registros, public.rha_suscripciones to authenticated;
grant select on public.rha_avisos_enviados, public.rha_auditoria to authenticated;

revoke all on function public.rha_auditar() from public, anon, authenticated;
