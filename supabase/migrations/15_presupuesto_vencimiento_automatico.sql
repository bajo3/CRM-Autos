-- Extiende el job diario existente (crm_run_daily_jobs) para marcar
-- presupuestos enviados como "vencido" cuando pasó su fecha de validez.
-- No destructivo: solo agrega una sentencia UPDATE más a la función.
create or replace function public.crm_run_daily_jobs()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update seguimiento set estado = 'vencido'
   where estado = 'pendiente' and fecha < current_date;

  update reserva set estado = 'vencida'
   where estado = 'activa' and vencimiento is not null and vencimiento < current_date;

  update vtv set estado = (case
      when fecha_vencimiento < current_date then 'vencida'
      when fecha_vencimiento <= current_date + 60 then 'por_vencer'
      else 'vigente'
    end)::estado_vtv
   where fecha_vencimiento is not null;

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

  update presupuesto set estado = 'vencido', updated_at = now()
   where estado = 'enviado' and validez is not null and validez < current_date;
end$function$
