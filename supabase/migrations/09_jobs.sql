-- =============================================================
-- 09_jobs — Jobs diarios de estados derivados del tiempo
-- Programado con pg_cron (diario 09:00). Ver /docs/DECISIONES_TECNICAS.md.
-- =============================================================

create or replace function public.crm_run_daily_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seguimientos pendientes cuya fecha ya pasó -> vencidos
  update seguimiento set estado = 'vencido'
   where estado = 'pendiente' and fecha < current_date;

  -- Reservas activas vencidas
  update reserva set estado = 'vencida'
   where estado = 'activa' and vencimiento is not null and vencimiento < current_date;

  -- Estado de VTV según fecha de vencimiento (alerta dentro de 60 días)
  update vtv set estado = (case
      when fecha_vencimiento < current_date then 'vencida'
      when fecha_vencimiento <= current_date + 60 then 'por_vencer'
      else 'vigente'
    end)::estado_vtv
   where fecha_vencimiento is not null;

  -- Créditos: avanzar cuota_actual por meses transcurridos y marcar la alerta
  -- de anteúltima cuota (estado por_terminar).
  update credito c set
     cuota_actual = least(
       greatest(0, (extract(year from age(current_date, c.fecha_inicio)) * 12
                  + extract(month from age(current_date, c.fecha_inicio)))::int),
       c.cantidad_cuotas),
     estado = (case
       when (extract(year from age(current_date, c.fecha_inicio)) * 12
           + extract(month from age(current_date, c.fecha_inicio)))::int >= c.cantidad_cuotas then 'finalizado'
       when (extract(year from age(current_date, c.fecha_inicio)) * 12
           + extract(month from age(current_date, c.fecha_inicio)))::int >= c.cantidad_cuotas - 1 then 'por_terminar'
       else c.estado::text
     end)::estado_credito,
     alerta_disparada = case
       when (extract(year from age(current_date, c.fecha_inicio)) * 12
           + extract(month from age(current_date, c.fecha_inicio)))::int >= c.cantidad_cuotas - 1 then true
       else c.alerta_disparada
     end
   where c.estado in ('activo', 'por_terminar');
end$$;

revoke execute on function public.crm_run_daily_jobs() from anon, authenticated, public;

-- Programar con pg_cron si está disponible (no aborta la migración si no lo está).
do $$
begin
  begin
    create extension if not exists pg_cron;
    perform cron.schedule('crm-daily-jobs', '0 9 * * *', 'select public.crm_run_daily_jobs()');
  exception when others then
    raise notice 'pg_cron no disponible o ya programado: %', sqlerrm;
  end;
end$$;
