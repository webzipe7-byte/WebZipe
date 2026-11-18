-- =====================================================================
-- Camello para toda Colombia: cada perfil tiene su ciudad.
-- Los clientes ven solo a los maestros conectados de la ciudad del servicio.
-- Se puede volver a ejecutar sin dañar nada.
-- =====================================================================
alter table public.perfiles add column if not exists ciudad text
  check (ciudad is null or ciudad ~ '^[a-z-]{2,40}$');

grant update (ciudad) on public.perfiles to authenticated;

-- Búsqueda rápida de maestros conectados por oficio y ciudad
create index if not exists perfiles_maestros_ciudad
  on public.perfiles (ciudad, categoria)
  where rol = 'trabajador' and conectado;
