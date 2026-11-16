-- =====================================================================
-- Camello · base de datos en Supabase
-- Una sola base para clientes y maestros.
-- Reglas: cada persona solo ve y cambia lo que le corresponde (RLS).
-- Se puede volver a ejecutar sin dañar nada.
-- =====================================================================

-- ---------- Perfiles públicos (lo que otros pueden ver) ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 80),
  rol text not null default 'cliente' check (rol in ('cliente', 'trabajador')),
  categoria text check (categoria is null or char_length(categoria) <= 40),
  anios int check (anios is null or anios between 0 and 60),
  conectado boolean not null default false,
  calificacion_suma int not null default 0,
  calificaciones int not null default 0,
  trabajos int not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

-- ---------- Datos privados (solo el dueño) ----------
create table if not exists public.privado (
  id uuid primary key references auth.users (id) on delete cascade,
  telefono text check (telefono is null or char_length(telefono) <= 20),
  datos jsonb not null default '{}'::jsonb check (pg_column_size(datos) < 200000),
  actualizado timestamptz not null default now()
);

-- ---------- Pedidos ----------
create table if not exists public.pedidos (
  id text primary key check (char_length(id) <= 40),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  trabajador_id uuid not null references auth.users (id) on delete cascade,
  datos jsonb not null check (pg_column_size(datos) < 20000),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists pedidos_usuario on public.pedidos (usuario_id, creado desc);
create index if not exists pedidos_trabajador on public.pedidos (trabajador_id, creado desc);

-- Código de seguridad: solo lo ve el cliente. El maestro lo confirma con una función.
create table if not exists public.pines (
  pedido_id text primary key references public.pedidos (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{4}$'),
  intentos int not null default 0,
  bloqueado_hasta timestamptz
);

-- ---------- Chat ----------
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  pedido_id text not null references public.pedidos (id) on delete cascade,
  autor uuid not null references auth.users (id) on delete cascade,
  rol text not null check (rol in ('cliente', 'trabajador')),
  texto text not null check (char_length(texto) between 1 and 300),
  creado timestamptz not null default now()
);
create index if not exists mensajes_pedido on public.mensajes (pedido_id, id);

-- ---------- Ubicación de los maestros ----------
create table if not exists public.ubicaciones (
  maestro_id uuid primary key references auth.users (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  actualizado timestamptz not null default now()
);

-- =====================================================================
-- Seguridad por filas (RLS)
-- =====================================================================
alter table public.perfiles enable row level security;
alter table public.privado enable row level security;
alter table public.pedidos enable row level security;
alter table public.pines enable row level security;
alter table public.mensajes enable row level security;
alter table public.ubicaciones enable row level security;

-- Nadie anónimo toca nada; los usuarios con sesión solo por las reglas de abajo
revoke all on public.perfiles, public.privado, public.pedidos, public.pines, public.mensajes, public.ubicaciones from anon;

drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated using (true);
drop policy if exists perfiles_crear on public.perfiles;
create policy perfiles_crear on public.perfiles for insert to authenticated
  with check (id = auth.uid() and calificacion_suma = 0 and calificaciones = 0 and trabajos = 0);
-- Los puntajes no se pueden cambiar a mano: solo con las funciones de abajo
revoke update on public.perfiles from authenticated;
grant update (nombre, categoria, anios, conectado, actualizado) on public.perfiles to authenticated;
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists privado_propio on public.privado;
create policy privado_propio on public.privado for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Pedidos: los ven el cliente y su maestro. Se crean y cambian solo con funciones.
drop policy if exists pedidos_ver on public.pedidos;
create policy pedidos_ver on public.pedidos for select to authenticated
  using (auth.uid() in (usuario_id, trabajador_id));
revoke insert, update, delete on public.pedidos from authenticated;

drop policy if exists pines_ver on public.pines;
create policy pines_ver on public.pines for select to authenticated using (usuario_id = auth.uid());
revoke insert, update, delete on public.pines from authenticated;

drop policy if exists mensajes_ver on public.mensajes;
create policy mensajes_ver on public.mensajes for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and auth.uid() in (p.usuario_id, p.trabajador_id)));
drop policy if exists mensajes_enviar on public.mensajes;
create policy mensajes_enviar on public.mensajes for insert to authenticated
  with check (
    autor = auth.uid()
    and exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and ((p.usuario_id = auth.uid() and rol = 'cliente') or (p.trabajador_id = auth.uid() and rol = 'trabajador'))
    )
  );
revoke update, delete on public.mensajes from authenticated;

drop policy if exists ubicaciones_ver on public.ubicaciones;
create policy ubicaciones_ver on public.ubicaciones for select to authenticated using (true);
drop policy if exists ubicaciones_propia on public.ubicaciones;
create policy ubicaciones_propia on public.ubicaciones for insert to authenticated with check (maestro_id = auth.uid());
drop policy if exists ubicaciones_mover on public.ubicaciones;
create policy ubicaciones_mover on public.ubicaciones for update to authenticated using (maestro_id = auth.uid()) with check (maestro_id = auth.uid());

-- =====================================================================
-- Funciones (las reglas del negocio viven en el servidor)
-- =====================================================================

-- El cliente crea un pedido para un maestro conectado
create or replace function public.crear_pedido(p_id text, p_trabajador uuid, p_datos jsonb, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_datos jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión de nuevo.'; end if;
  if p_trabajador = auth.uid() then raise exception 'No puedes pedirte un servicio a ti mismo.'; end if;
  if not exists (select 1 from perfiles where id = p_trabajador and rol = 'trabajador' and conectado) then
    raise exception 'Ese maestro ya no está conectado. Elige otro.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'Código no válido.'; end if;
  if (select count(*) from pedidos where usuario_id = auth.uid() and creado > now() - interval '1 minute') >= 3 then
    raise exception 'Estás enviando muchas solicitudes. Espera un momento.';
  end if;
  v_datos := (p_datos - 'pin' - 'pago' - 'calificacion' - 'cancelado')
    || jsonb_build_object(
      'id', p_id, 'usuarioId', auth.uid(), 'trabajadorId', p_trabajador,
      'estado', 'buscando', 'real', true,
      'creado', (extract(epoch from now()) * 1000)::bigint,
      'inicio', (extract(epoch from now()) * 1000)::bigint,
      'tiempos', jsonb_build_object('buscando', (extract(epoch from now()) * 1000)::bigint),
      'pago', null, 'calificacion', null, 'cancelado', null
    );
  insert into pedidos (id, usuario_id, trabajador_id, datos) values (p_id, auth.uid(), p_trabajador, v_datos);
  insert into pines (pedido_id, usuario_id, pin) values (p_id, auth.uid(), p_pin);
  return v_datos;
end $$;

-- El maestro avanza su pedido: aceptar, rechazar, salir, llegar (con código), terminar
create or replace function public.avanzar_pedido(p_id text, p_accion text, p_pin text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p pedidos%rowtype;
  v_pin pines%rowtype;
  v_estado text;
  v_desde text;
  v_nuevo text;
  v_ahora bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select * into p from pedidos where id = p_id for update;
  if not found or p.trabajador_id <> auth.uid() then raise exception 'Este pedido no es tuyo.'; end if;
  if p.datos ? 'cancelado' and p.datos->'cancelado' <> 'null'::jsonb then raise exception 'El cliente canceló este pedido.'; end if;
  v_estado := p.datos->>'estado';
  v_desde := case p_accion when 'aceptar' then 'buscando' when 'rechazar' then 'buscando' when 'salir' then 'aceptado'
                           when 'llegar' then 'en_camino' when 'terminar' then 'en_proceso' end;
  v_nuevo := case p_accion when 'aceptar' then 'aceptado' when 'salir' then 'en_camino'
                           when 'llegar' then 'en_proceso' when 'terminar' then 'finalizado' end;
  if v_desde is null then raise exception 'Acción no válida.'; end if;
  if v_estado <> v_desde then raise exception 'El pedido ya cambió. Revisa su estado.'; end if;

  if p_accion = 'rechazar' then
    update pedidos set actualizado = now(), datos = datos || jsonb_build_object('cancelado',
      jsonb_build_object('fecha', v_ahora, 'motivo', 'El maestro no pudo tomar el servicio. Elige otro maestro.', 'por', 'maestro'))
    where id = p_id returning datos into p.datos;
    return p.datos;
  end if;

  if p_accion = 'llegar' then
    select * into v_pin from pines where pedido_id = p_id for update;
    if v_pin.bloqueado_hasta is not null and v_pin.bloqueado_hasta > now() then
      raise exception 'Demasiados intentos. Espera % min.', ceil(extract(epoch from (v_pin.bloqueado_hasta - now())) / 60);
    end if;
    if coalesce(p_pin, '') <> v_pin.pin then
      -- Al quinto intento malo se bloquea 5 minutos y se reinicia el contador
      update pines set intentos = case when intentos + 1 >= 5 then 0 else intentos + 1 end,
        bloqueado_hasta = case when intentos + 1 >= 5 then now() + interval '5 minutes' else bloqueado_hasta end
      where pedido_id = p_id;
      return jsonb_build_object('error', case when v_pin.intentos + 1 >= 5 then 'Demasiados intentos. Espera 5 min.'
        else format('Ese no es el código del cliente. Te quedan %s intentos.', 5 - (v_pin.intentos + 1)) end);
    end if;
    update pines set intentos = 0, bloqueado_hasta = null where pedido_id = p_id;
  end if;

  update pedidos set actualizado = now(), datos = jsonb_set(
      jsonb_set(datos, '{estado}', to_jsonb(v_nuevo)),
      '{tiempos}', coalesce(datos->'tiempos', '{}'::jsonb) || jsonb_build_object(v_nuevo, v_ahora))
  where id = p_id returning datos into p.datos;
  return p.datos;
end $$;

-- El cliente cancela, paga o califica su pedido
create or replace function public.actualizar_pedido(p_id text, p_accion text, p_valor jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p pedidos%rowtype;
  v_estado text;
  v_estrellas int;
begin
  select * into p from pedidos where id = p_id for update;
  if not found or p.usuario_id <> auth.uid() then raise exception 'Este pedido no es tuyo.'; end if;
  v_estado := p.datos->>'estado';

  if p_accion = 'cancelar' then
    if v_estado not in ('buscando', 'aceptado') or (p.datos->'cancelado') <> 'null'::jsonb then
      raise exception 'El maestro ya va en camino. Ya no se puede cancelar.';
    end if;
    update pedidos set actualizado = now(), datos = datos || jsonb_build_object('cancelado',
      jsonb_build_object('fecha', (extract(epoch from now()) * 1000)::bigint, 'motivo', left(coalesce(p_valor->>'motivo', 'Cancelaste este servicio.'), 120), 'por', 'cliente'))
    where id = p_id returning datos into p.datos;

  elsif p_accion = 'pagar' then
    if v_estado <> 'finalizado' or (p.datos->'pago') <> 'null'::jsonb then raise exception 'Este pedido no está listo para pagar.'; end if;
    update pedidos set actualizado = now(), datos = jsonb_set(datos, '{pago}', p_valor) where id = p_id returning datos into p.datos;
    update perfiles set trabajos = trabajos + 1 where id = p.trabajador_id;

  elsif p_accion = 'calificar' then
    if (p.datos->'pago') = 'null'::jsonb or (p.datos->'calificacion') <> 'null'::jsonb then raise exception 'Ya calificaste este servicio.'; end if;
    v_estrellas := (p_valor->>'estrellas')::int;
    if v_estrellas not between 1 and 5 then raise exception 'Calificación no válida.'; end if;
    update pedidos set actualizado = now(), datos = jsonb_set(datos, '{calificacion}',
      jsonb_build_object('estrellas', v_estrellas, 'etiquetas', coalesce(p_valor->'etiquetas', '[]'::jsonb),
        'comentario', left(coalesce(p_valor->>'comentario', ''), 300), 'fecha', (extract(epoch from now()) * 1000)::bigint))
    where id = p_id returning datos into p.datos;
    update perfiles set calificacion_suma = calificacion_suma + v_estrellas, calificaciones = calificaciones + 1 where id = p.trabajador_id;
  else
    raise exception 'Acción no válida.';
  end if;
  return p.datos;
end $$;

-- Borrar la propia cuenta (y todo lo suyo, en cascada)
create or replace function public.eliminar_mi_cuenta()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión de nuevo.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.crear_pedido(text, uuid, jsonb, text) from public, anon;
revoke all on function public.avanzar_pedido(text, text, text) from public, anon;
revoke all on function public.actualizar_pedido(text, text, jsonb) from public, anon;
revoke all on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.crear_pedido(text, uuid, jsonb, text) to authenticated;
grant execute on function public.avanzar_pedido(text, text, text) to authenticated;
grant execute on function public.actualizar_pedido(text, text, jsonb) to authenticated;
grant execute on function public.eliminar_mi_cuenta() to authenticated;

-- =====================================================================
-- Tiempo real: avisar al instante los cambios de estas tablas
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['perfiles', 'pedidos', 'mensajes', 'ubicaciones'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
