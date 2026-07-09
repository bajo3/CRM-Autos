-- RPC público: detalle de un vehículo publicado en la vitrina, con todas sus fotos.
-- Mismo criterio de visibilidad que stock_publico (publicado_web, no vendido, empresa activa).
-- No expone patente, chasis, costos ni márgenes.
create or replace function public.vehiculo_publico(p_slug text, p_id uuid)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $$
  select case when e.id is null then null else jsonb_build_object(
    'empresa', jsonb_build_object(
      'nombre', e.nombre,
      'telefono', e.telefono,
      'email', e.email,
      'direccion', e.direccion,
      'localidad', e.localidad,
      'provincia', e.provincia,
      'logo_url', e.logo_url,
      'color_primario', e.color_primario,
      'slug', e.slug
    ),
    'vehiculo', (
      select jsonb_build_object(
        'id', v.id,
        'marca', v.marca,
        'modelo', v.modelo,
        'version', v.version,
        'anio', v.anio,
        'kilometros', v.kilometros,
        'combustible', v.combustible,
        'transmision', v.transmision,
        'color', v.color,
        'motor', v.motor,
        'observaciones', v.observaciones,
        'precio', case when v.ocultar_precio then null else v.precio_venta end,
        'mostrar_whatsapp', v.mostrar_whatsapp,
        'destacado', v.destacado,
        'fotos', coalesce((
          select jsonb_agg(f.url order by f.es_principal desc, f.orden asc)
          from public.foto_vehiculo f
          where f.vehiculo_id = v.id
        ), '[]'::jsonb)
      )
      from public.vehiculo v
      where v.id = p_id
        and v.empresa_id = e.id
        and v.publicado_web = true
        and v.estado <> 'vendido'
    )
  ) end
  from public.empresa e
  where e.slug = p_slug and e.activa = true;
$$;
