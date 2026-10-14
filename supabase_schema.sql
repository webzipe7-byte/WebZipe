-- ============================================================================
-- WEBZIPE — Integración de reservas/contacto con asignación aleatoria
-- Motor: PostgreSQL (pensado para un proyecto gratuito de Supabase)
--
-- Cómo usarlo:
--   1. Crea un proyecto gratuito en https://supabase.com
--   2. Abre el "SQL Editor" del proyecto y pega TODO este archivo. Ejecuta.
--   3. En Project Settings → API copia "Project URL" y la clave "anon public".
--   4. Pega esos dos valores en index.html, dentro del bloque del formulario
--      "startForm", en las constantes SUPABASE_URL y SUPABASE_ANON_KEY.
--
-- Este script es idempotente: se puede volver a ejecutar sin duplicar
-- trabajadores ni romper nada (usa IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

create extension if not exists pgcrypto; -- necesaria para gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. FUENTE ÚNICA DE VERDAD: trabajadores autorizados
-- ----------------------------------------------------------------------------
create table if not exists public.workers (
  id          serial primary key,
  phone       text not null unique,   -- formato internacional, ej: +573102363531
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.workers is 'Los ÚNICOS trabajadores autorizados para recibir reservas asignadas al azar.';

-- Seed idempotente: exactamente los dos números oficiales, una sola vez.
insert into public.workers (phone, active) values
  ('+573102363531', true),
  ('+573117453436', true)
on conflict (phone) do nothing;

-- ----------------------------------------------------------------------------
-- 2. RESERVAS / SOLICITUDES DE CONTACTO
-- ----------------------------------------------------------------------------
create table if not exists public.reservations (
  id                uuid primary key default gen_random_uuid(),
  customer_name     text not null,
  phone             text not null,
  email             text,
  reservation_date  date,
  reservation_time  time,
  request_type      text,                 -- ej: el plan/paquete de interés
  message           text,
  worker_id         integer not null references public.workers(id),
  status            text not null default 'nueva',
  idempotency_key   uuid not null unique, -- evita reservas duplicadas por doble clic/reintento
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.reservations is 'Cada fila guarda a qué trabajador quedó asignada la solicitud, de forma permanente.';

create index if not exists reservations_worker_id_idx on public.reservations(worker_id);
create index if not exists reservations_created_at_idx on public.reservations(created_at desc);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. SEGURIDAD: bloquear acceso directo a las tablas desde el navegador.
--    La única puerta de entrada permitida es la función create_reservation.
-- ----------------------------------------------------------------------------
alter table public.workers enable row level security;
alter table public.reservations enable row level security;
-- No se crea ninguna policy para "anon"/"authenticated": con RLS activado
-- y sin policies, TODO acceso directo (select/insert/update/delete) queda
-- denegado por defecto para esos roles. Solo la función SECURITY DEFINER
-- de abajo puede escribir, y solo a través de la ruta que ella controla.

revoke all on public.workers      from anon, authenticated;
revoke all on public.reservations from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. FUNCIÓN: create_reservation
--    - Valida los datos en el backend (nunca confía en el navegador).
--    - Si ya existe una reserva con esa idempotency_key, la devuelve tal cual
--      (no vuelve a aleatorizar, evita duplicados por doble clic/reintento).
--    - Si es nueva, selecciona al azar UN trabajador activo (random() real,
--      no alternancia 1-2-1-2) y crea la reserva en una sola transacción.
--    - El frontend NO puede elegir ni enviar el worker_id: no es un
--      parámetro de la función, así que no hay forma de manipularlo.
-- ----------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_customer_name     text,
  p_phone             text,
  p_email             text default null,
  p_reservation_date  date default null,
  p_reservation_time  time default null,
  p_request_type      text default null,
  p_message           text default null,
  p_idempotency_key   uuid default null
) returns table (
  reservation_id  uuid,
  assigned_phone  text,
  status          text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing  record;
  v_worker    record;
  v_id        uuid;
begin
  -- Validación obligatoria en el backend (la del navegador es solo UX).
  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'INVALID_NAME';
  end if;

  if p_phone is null or p_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'INVALID_PHONE';
  end if;

  if p_email is not null and length(trim(p_email)) > 0
     and p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  if p_idempotency_key is null then
    raise exception 'MISSING_IDEMPOTENCY_KEY';
  end if;

  -- Idempotencia (camino rápido): si esta clave ya generó una reserva,
  -- se devuelve la misma (mismo trabajador de siempre). NO se re-aleatoriza.
  select r.id, w.phone, r.status
    into v_existing
    from public.reservations r
    join public.workers w on w.id = r.worker_id
   where r.idempotency_key = p_idempotency_key;

  if found then
    return query select v_existing.id, v_existing.phone, v_existing.status;
    return;
  end if;

  -- Selección aleatoria REAL (no alternancia) entre los trabajadores activos.
  select * into v_worker
    from public.workers
   where active = true
   order by random()
   limit 1;

  if not found then
    raise exception 'NO_ACTIVE_WORKER';
  end if;

  -- Inserción atómica: si dos solicitudes con la MISMA clave llegan en el
  -- mismo instante (doble clic real, dos pestañas, reintento de red), la
  -- restricción UNIQUE + ON CONFLICT DO NOTHING garantiza que solo una
  -- gane la carrera; la otra no lanza error ni crea una segunda fila.
  insert into public.reservations (
    customer_name, phone, email, reservation_date, reservation_time,
    request_type, message, worker_id, idempotency_key
  ) values (
    trim(p_customer_name), p_phone, nullif(trim(coalesce(p_email, '')), ''),
    p_reservation_date, p_reservation_time,
    p_request_type, p_message, v_worker.id, p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    -- Esta llamada ganó la carrera: devuelve el trabajador recién asignado.
    return query select v_id, v_worker.phone, 'nueva'::text;
    return;
  end if;

  -- Esta llamada perdió la carrera: otra ya insertó con la misma clave.
  -- Se descarta la selección aleatoria de esta llamada (no se usa) y se
  -- devuelve la reserva que sí quedó guardada, sin duplicar nada.
  select r.id, w.phone, r.status
    into v_existing
    from public.reservations r
    join public.workers w on w.id = r.worker_id
   where r.idempotency_key = p_idempotency_key;

  return query select v_existing.id, v_existing.phone, v_existing.status;
end;
$$;

-- Solo esta función es invocable desde el navegador (rol anon de Supabase).
-- Al ser SECURITY DEFINER, se ejecuta con permisos del dueño y sí puede
-- leer/escribir workers y reservations, aunque esos roles no tengan acceso
-- directo a las tablas (punto 3 de arriba).
grant execute on function public.create_reservation(
  text, text, text, date, time, text, text, uuid
) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. (Opcional) Consultar una reserva por id, sin exponer la tabla completa.
--    Útil si más adelante quieres una página de "estado de mi solicitud".
-- ----------------------------------------------------------------------------
create or replace function public.get_reservation(p_id uuid)
returns table (
  reservation_id  uuid,
  status          text,
  assigned_phone  text,
  created_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.status, w.phone, r.created_at
    from public.reservations r
    join public.workers w on w.id = r.worker_id
   where r.id = p_id;
$$;

grant execute on function public.get_reservation(uuid) to anon, authenticated;


-- ============================================================================
-- REGISTRO DE AUTORIZACIONES (Ley 1581 de 2012 — prueba del consentimiento)
-- Guarda cuándo y cómo cada persona aceptó: cookies y formulario
-- (términos y condiciones + política de privacidad, casillas separadas).
-- Ejecutar este bloque en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================
create table if not exists public.consent_log (
  id              uuid primary key default gen_random_uuid(),
  consent_id      uuid not null unique,      -- evita duplicados por reintentos
  kind            text not null check (kind in ('cookies', 'form')),
  choice          jsonb not null,            -- ej: {"preferences": true} o {"terms": true, "privacy": true}
  policy_version  text not null,             -- versión de los documentos aceptados
  subject_email   text,                      -- solo en el formulario
  reservation_id  uuid references public.reservations(id) on delete set null,
  ip_address      text,                      -- tomada de las cabeceras de la petición
  user_agent      text,
  page_url        text,
  created_at      timestamptz not null default now()
);

comment on table public.consent_log is 'Prueba de la autorización del titular: fecha, hora, IP, versión y elección.';

create index if not exists consent_log_email_idx on public.consent_log(subject_email);
create index if not exists consent_log_created_idx on public.consent_log(created_at desc);

alter table public.consent_log enable row level security;
revoke all on public.consent_log from anon, authenticated;

create or replace function public.log_consent(
  p_consent_id      uuid,
  p_kind            text,
  p_choice          jsonb,
  p_policy_version  text,
  p_email           text default null,
  p_reservation_id  uuid default null,
  p_user_agent      text default null,
  p_page_url        text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip      text;
begin
  if p_consent_id is null then raise exception 'MISSING_CONSENT_ID'; end if;
  if p_kind not in ('cookies', 'form') then raise exception 'INVALID_KIND'; end if;
  if p_choice is null then raise exception 'MISSING_CHOICE'; end if;
  if p_policy_version is null or length(p_policy_version) > 20 then raise exception 'INVALID_VERSION'; end if;
  if p_email is not null and length(p_email) > 0
     and p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  -- La IP viene de las cabeceras que PostgREST pasa a la función (no del navegador).
  begin
    v_headers := current_setting('request.headers', true)::json;
    v_ip := trim(split_part(coalesce(v_headers->>'x-forwarded-for', v_headers->>'cf-connecting-ip', ''), ',', 1));
  exception when others then
    v_ip := null;
  end;

  insert into public.consent_log
    (consent_id, kind, choice, policy_version, subject_email, reservation_id, ip_address, user_agent, page_url)
  values
    (p_consent_id, p_kind, p_choice, p_policy_version, nullif(trim(p_email), ''), p_reservation_id,
     nullif(v_ip, ''), left(p_user_agent, 400), left(p_page_url, 400))
  on conflict (consent_id) do nothing;
end;
$$;

revoke all on function public.log_consent(uuid, text, jsonb, text, text, uuid, text, text) from public;
grant execute on function public.log_consent(uuid, text, jsonb, text, text, uuid, text, text) to anon, authenticated;
