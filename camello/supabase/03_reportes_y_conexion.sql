-- =====================================================================
-- 1. Reportes y mensajes a soporte (los revisa el dueño en Supabase → Table editor → reportes)
-- 2. Solo se le puede pedir a un maestro que haya dado señal de vida hace poco
-- Se puede volver a ejecutar sin dañar nada.
-- =====================================================================
create table if not exists public.reportes (
  id bigint generated always as identity primary key,
  autor uuid default auth.uid() references auth.users (id) on delete set null,
  pedido_id text references public.pedidos (id) on delete set null,
  tipo text not null check (tipo in ('problema', 'soporte')),
  texto text not null check (char_length(texto) between 5 and 1000),
  revisado boolean not null default false,
  creado timestamptz not null default now()
);
alter table public.reportes enable row level security;
revoke all on public.reportes from anon;
revoke update, delete on public.reportes from authenticated;

drop policy if exists reportes_enviar on public.reportes;
create policy reportes_enviar on public.reportes for insert to authenticated
  with check (
    autor = auth.uid() and revisado = false
    and (pedido_id is null or exists (
      select 1 from public.pedidos p where p.id = pedido_id and auth.uid() in (p.usuario_id, p.trabajador_id)))
    and (select count(*) from public.reportes r where r.autor = auth.uid() and r.creado > now() - interval '1 hour') < 10
  );
drop policy if exists reportes_ver on public.reportes;
create policy reportes_ver on public.reportes for select to authenticated using (autor = auth.uid());

-- El servidor solo deja pedirle a maestros conectados que dieron señal en los últimos 5 minutos
create or replace function public.crear_pedido(p_id text, p_trabajador uuid, p_datos jsonb, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_datos jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión de nuevo.'; end if;
  if p_trabajador = auth.uid() then raise exception 'No puedes pedirte un servicio a ti mismo.'; end if;
  if not exists (select 1 from perfiles where id = p_trabajador and rol = 'trabajador' and conectado
                 and actualizado > now() - interval '5 minutes') then
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
