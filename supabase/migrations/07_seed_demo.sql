-- =============================================================
-- 07_seed_demo — Datos demo: Jesús Díaz Automotores
-- Usuarios demo (password: demo1234):
--   dueno@jesusdiaz.com / vendedor1@jesusdiaz.com /
--   vendedor2@jesusdiaz.com / admin@jesusdiaz.com
-- IDs fijos (no generados) para poder referenciar entre filas.
-- =============================================================

-- ---------- Empresa ----------
insert into public.empresa (id, nombre, slug, cuit, telefono, email, direccion, localidad, provincia)
values ('11111111-1111-1111-1111-111111111111', 'Jesús Díaz Automotores', 'jesus-diaz',
        '30-71234567-8', '+54 9 2494 000000', 'contacto@jesusdiaz.com',
        'Av. Santamarina 1234', 'Tandil', 'Buenos Aires')
on conflict (id) do nothing;

-- ---------- Usuarios auth + identities (el trigger crea los profiles) ----------
do $$
declare
  v_empresa uuid := '11111111-1111-1111-1111-111111111111';
  r record;
begin
  for r in
    select * from (values
      ('a0000000-0000-0000-0000-000000000001'::uuid, 'dueno@jesusdiaz.com',     'Jesús',  'Díaz',     'dueno'),
      ('a0000000-0000-0000-0000-000000000002'::uuid, 'vendedor1@jesusdiaz.com', 'Carlos', 'Gómez',    'vendedor'),
      ('a0000000-0000-0000-0000-000000000003'::uuid, 'vendedor2@jesusdiaz.com', 'Lucía',  'Fernández','vendedor'),
      ('a0000000-0000-0000-0000-000000000004'::uuid, 'admin@jesusdiaz.com',     'Marta',  'López',    'administrativo')
    ) as t(id, email, nombre, apellido, rol)
  loop
    if not exists (select 1 from auth.users where id = r.id) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated',
        r.email, crypt('demo1234', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nombre', r.nombre, 'apellido', r.apellido,
                           'empresa_id', v_empresa::text, 'rol', r.rol),
        now(), now(), '', '', '', ''
      );
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), r.id,
        jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
        'email', r.id::text, now(), now(), now()
      );
    end if;
  end loop;
end$$;

-- ---------- Vehículos ----------
insert into public.vehiculo (id, empresa_id, marca, modelo, version, anio, kilometros, patente,
  color, combustible, transmision, precio_venta, precio_costo, estado, titularidad,
  estado_documental, fecha_ingreso, publicado_web, publicado_ml, destacado)
values
 ('b0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Fiat','Cronos','Drive 1.3',2020,52000,'AD123BC','Gris','nafta','manual',16500000,13800000,'disponible','propio','completo',now()-interval '40 days',true,true,true),
 ('b0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Volkswagen','Gol Trend','Trendline 1.6',2018,78000,'GHI456','Blanco','nafta','manual',13200000,11000000,'publicado','propio','incompleto',now()-interval '25 days',true,false,false),
 ('b0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Toyota','Corolla','XEI 1.8 CVT',2019,61000,'AB789CD','Negro','nafta','automatica',24500000,21000000,'reservado','propio','completo',now()-interval '60 days',true,true,true),
 ('b0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Peugeot','208','Feline 1.6',2021,33000,'AE012FG','Rojo','nafta','manual',19800000,16500000,'en_preparacion','propio','pendiente',now()-interval '10 days',false,false,false),
 ('b0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Ford','Ranger','XLT 3.2 4x4',2020,95000,'JKL345','Plata','diesel','automatica',38000000,32000000,'disponible','consignado','observado',now()-interval '5 days',true,false,true)
on conflict (id) do nothing;

-- ---------- Clientes / leads ----------
insert into public.cliente (id, empresa_id, nombre, apellido, telefono, whatsapp, email, dni_cuit,
  localidad, origen, estado, vendedor_id, vehiculo_interes_id, presupuesto_aprox, observaciones, proximo_seguimiento)
values
 ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Diego','Martínez','2494111111','2494111111','diego@mail.com','30111222','Tandil','whatsapp','pidio_financiacion','a0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001',16000000,'Quiere financiar en 12 cuotas',now()),
 ('c0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Sofía','Romero','2494222222','2494222222','sofia@mail.com','33222333','Rauch','instagram','interesado','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000002',12000000,'Entrega un Gol 2012 como parte de pago',now()+interval '1 day'),
 ('c0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Hernán','Suárez','2494333333','2494333333','hernan@mail.com','28333444','Azul','referido','contactado','a0000000-0000-0000-0000-000000000002',null,22000000,'Busca SUV o pick-up, encargo activo',now()+interval '2 days'),
 ('c0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Valeria','Aguirre','2494444444','2494444444','valeria@mail.com','35444555','Tandil','web','reservado','a0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000003',24500000,'Reservó el Corolla, seña entregada',now()),
 ('c0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Roberto','Paz','2494555555','2494555555','roberto@mail.com','20555666','Tandil','presencial','vendido','a0000000-0000-0000-0000-000000000002',null,15000000,'Compró en efectivo, recontacto postventa',null)
on conflict (id) do nothing;

-- ---------- Seguimientos ----------
insert into public.seguimiento (empresa_id, cliente_id, vendedor_id, fecha, motivo, estado)
values
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',now(),'Enviar plan de cuotas','pendiente'),
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002',now()-interval '2 days','Avisar si entra pick-up','vencido'),
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',now()+interval '1 day','Tasar usado','pendiente');

-- ---------- Consultas (cliente <-> auto) ----------
insert into public.consulta (empresa_id, cliente_id, vehiculo_id, canal, pendiente)
values
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','whatsapp',true),
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','instagram',true),
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000003','web',false);

-- ---------- Encargo ----------
insert into public.encargo (empresa_id, cliente_id, marca_buscada, modelo_buscado, anio_min, anio_max,
  km_max, presupuesto_max, combustible, urgencia, estado, vendedor_id, observaciones)
values
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000003','Ford','Ranger',2018,2021,120000,40000000,'diesel','alta','buscando','a0000000-0000-0000-0000-000000000002','Pick-up 4x4, urgente');

-- ---------- Reserva (Corolla) ----------
insert into public.reserva (empresa_id, cliente_id, vehiculo_id, monto_sena, fecha_reserva, vencimiento, medio_pago, estado)
values
 ('11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000003',1000000,now()-interval '3 days',now()+interval '1 day','transferencia','activa');

-- ---------- Venta con crédito (cliente Roberto, efectivo) + venta a crédito demo ----------
insert into public.venta (id, empresa_id, cliente_id, vehiculo_id, vendedor_id, fecha_venta,
  precio_final, sena, forma_pago, tiene_credito, estado_entrega)
values
 ('d0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',now()-interval '180 days',13000000,13000000,'efectivo',false,'entregado'),
 ('d0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',now()-interval '300 days',16000000,4000000,'credito',true,'entregado')
on conflict (id) do nothing;

-- Crédito 12 cuotas, va por la 11 (dispara alerta anteúltima)
insert into public.credito (empresa_id, venta_id, cantidad_cuotas, fecha_inicio, fecha_fin_estimada, cuota_actual, estado)
values
 ('11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000002',12,now()-interval '300 days',now()+interval '30 days',11,'por_terminar');

-- Postventa a 6 meses de la venta en efectivo (alerta vence hoy)
insert into public.postventa (empresa_id, venta_id, cliente_id, fecha_alerta, realizada)
values
 ('11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005',now(),false);

-- ---------- VTV demo (mes sugerido según último dígito, calendario PBA) ----------
insert into public.vtv (empresa_id, vehiculo_id, patente, ultimo_digito, jurisdiccion, mes_sugerido, fecha_vencimiento, estado)
values
 ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','AD123BC','3','Buenos Aires',3,now()+interval '20 days','por_vencer'),
 ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','GHI456','6','Buenos Aires',6,now()-interval '10 days','vencida'),
 ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000003','AB789CD','9','Buenos Aires',9,now()+interval '120 days','vigente');

-- ---------- Gastos demo sobre un vehículo ----------
insert into public.gasto_vehiculo (empresa_id, vehiculo_id, tipo, concepto, monto, responsable)
values
 ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000004','detailing','Pulido y limpieza integral',180000,'Taller propio'),
 ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000004','mecanica','Service y correa',350000,'Mecánico externo');
