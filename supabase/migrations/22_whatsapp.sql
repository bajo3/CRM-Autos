-- =============================================================
-- 22_whatsapp — Módulo WhatsApp Business (Cloud API) multiagencia
-- Tablas: cuenta, conversación, mensaje, config bot, plantilla,
-- programados y log de eventos. RLS por empresa en todas.
-- Aditiva: no toca tablas existentes.
-- =============================================================

-- ---------- Enums (create type no soporta IF NOT EXISTS: guard por pg_type) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_wa_cuenta') then
    create type estado_wa_cuenta as enum ('conectado','desconectado','error');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_wa_conversacion') then
    create type estado_wa_conversacion as enum ('abierta','pendiente','cerrada');
  end if;
  if not exists (select 1 from pg_type where typname = 'direccion_wa_mensaje') then
    create type direccion_wa_mensaje as enum ('entrante','saliente');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_wa_mensaje') then
    create type tipo_wa_mensaje as enum ('texto','imagen','audio','documento','video','plantilla','sistema','otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_wa_mensaje') then
    create type estado_wa_mensaje as enum ('recibido','enviado','entregado','leido','fallado');
  end if;
  if not exists (select 1 from pg_type where typname = 'categoria_wa_plantilla') then
    create type categoria_wa_plantilla as enum ('utility','marketing','authentication');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_wa_plantilla') then
    create type estado_wa_plantilla as enum ('aprobada','pendiente','rechazada','desconocido');
  end if;
  if not exists (select 1 from pg_type where typname = 'motivo_wa_programado') then
    create type motivo_wa_programado as enum ('seguimiento','cuota','postventa','vtv','service','renovacion','promo','otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_wa_programado') then
    create type estado_wa_programado as enum ('pendiente','enviado','fallado','cancelado');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_wa_evento') then
    create type tipo_wa_evento as enum (
      'conexion','desconexion','webhook_error','mensaje_enviado','mensaje_fallado',
      'bot_activado','bot_pausado','asignacion','programado_creado','programado_cancelado','otro'
    );
  end if;
end$$;

-- ---------- Cuenta de WhatsApp por empresa ----------
create table if not exists public.whatsapp_account (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid not null references public.empresa(id) on delete cascade,
  business_id             text,
  waba_id                 text,
  phone_number_id         text,
  display_phone_number    text,
  access_token_encrypted  text,
  estado                  estado_wa_cuenta not null default 'desconectado',
  conectado_por           uuid references public.profile(id) on delete set null,
  conectado_at            timestamptz,
  last_error              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (empresa_id)
);
create index if not exists idx_wa_account_phone on public.whatsapp_account(phone_number_id);

-- ---------- Conversación (una por empresa+teléfono) ----------
create table if not exists public.whatsapp_conversacion (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresa(id) on delete cascade,
  account_id            uuid references public.whatsapp_account(id) on delete set null,
  cliente_id            uuid references public.cliente(id) on delete set null,
  telefono              text not null,               -- E.164 sin '+' (ej. 5492491234567)
  nombre_contacto       text,
  estado                estado_wa_conversacion not null default 'abierta',
  asignado_a            uuid references public.profile(id) on delete set null,
  bot_activo            boolean not null default true,
  bot_pausado_hasta     timestamptz,                 -- pausa temporal por intervención humana
  ultima_entrada_at     timestamptz,                 -- último mensaje ENTRANTE (ventana 24 h)
  last_message_at       timestamptz,
  last_message_preview  text,
  no_leidos             int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (empresa_id, telefono)
);
create index if not exists idx_wa_conv_empresa_last on public.whatsapp_conversacion(empresa_id, last_message_at desc);
create index if not exists idx_wa_conv_cliente on public.whatsapp_conversacion(cliente_id);

-- ---------- Mensaje ----------
create table if not exists public.whatsapp_mensaje (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresa(id) on delete cascade,
  conversacion_id  uuid not null references public.whatsapp_conversacion(id) on delete cascade,
  wa_message_id    text,                              -- id de Meta (wamid...) para idempotencia/estados
  direccion        direccion_wa_mensaje not null,
  tipo             tipo_wa_mensaje not null default 'texto',
  cuerpo           text,
  media_url        text,
  estado           estado_wa_mensaje not null default 'recibido',
  error_mensaje    text,
  raw_payload      jsonb,
  enviado_por      uuid references public.profile(id) on delete set null,
  enviado_por_bot  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_wa_msg_conv_created on public.whatsapp_mensaje(conversacion_id, created_at);
create index if not exists idx_wa_msg_empresa on public.whatsapp_mensaje(empresa_id);
-- Idempotencia del webhook: el mismo wamid no se inserta dos veces
create unique index if not exists uq_wa_msg_wamid on public.whatsapp_mensaje(wa_message_id) where wa_message_id is not null;

-- ---------- Config del bot por empresa ----------
create table if not exists public.whatsapp_bot_config (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references public.empresa(id) on delete cascade,
  habilitado               boolean not null default false,
  nombre_comercial         text,
  direccion                text,
  horarios                 text,
  financiacion             text,     -- descripción de financiación ofrecida (si está vacío, el bot no promete nada)
  politica_permuta         text,
  mensaje_fallback         text not null default 'En breve un asesor te va a responder por acá. ¡Gracias por escribirnos!',
  keywords_handoff         jsonb not null default '["humano","asesor","vendedor","persona"]',
  tono                     text not null default 'profesional' check (tono in ('profesional','cercano','breve')),
  pausa_intervencion_min   int not null default 240,  -- minutos de pausa del bot cuando responde un humano
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (empresa_id)
);

-- ---------- Plantillas (registro local; sync con Meta queda para producción) ----------
create table if not exists public.whatsapp_plantilla (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresa(id) on delete cascade,
  nombre            text not null,
  idioma            text not null default 'es_AR',
  categoria         categoria_wa_plantilla not null default 'utility',
  cuerpo            text not null,                    -- con placeholders {{1}}, {{2}}, ...
  variables_schema  jsonb not null default '[]',      -- [{"n":1,"descripcion":"nombre del cliente"}]
  estado            estado_wa_plantilla not null default 'desconocido',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (empresa_id, nombre, idioma)
);

-- ---------- Mensajes programados ----------
create table if not exists public.whatsapp_programado (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresa(id) on delete cascade,
  cliente_id          uuid references public.cliente(id) on delete set null,
  conversacion_id     uuid references public.whatsapp_conversacion(id) on delete set null,
  telefono            text not null,
  send_at             timestamptz not null,
  plantilla_id        uuid references public.whatsapp_plantilla(id) on delete set null,
  plantilla_nombre    text,          -- snapshot (por si borran la plantilla)
  idioma              text,
  variables           jsonb not null default '[]',
  cuerpo_texto        text,          -- alternativa a plantilla: solo se envía si hay ventana de 24 h abierta
  motivo              motivo_wa_programado not null default 'otro',
  estado              estado_wa_programado not null default 'pendiente',
  error_mensaje       text,
  intentos_restantes  int not null default 3,
  creado_por          uuid references public.profile(id) on delete set null,
  creado_por_sistema  boolean not null default false,
  enviado_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- El worker barre por estado+fecha: índice parcial para la cola
create index if not exists idx_wa_prog_cola on public.whatsapp_programado(send_at) where estado = 'pendiente';
create index if not exists idx_wa_prog_empresa on public.whatsapp_programado(empresa_id, estado, send_at);
create index if not exists idx_wa_prog_cliente on public.whatsapp_programado(cliente_id);

-- ---------- Log de eventos / auditoría ----------
create table if not exists public.whatsapp_evento_log (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa(id) on delete cascade,
  tipo        tipo_wa_evento not null,
  detalle     text,
  datos       jsonb,
  usuario_id  uuid references public.profile(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_wa_log_empresa on public.whatsapp_evento_log(empresa_id, created_at desc);

-- ---------- updated_at ----------
do $$
declare t text;
begin
  foreach t in array array[
    'whatsapp_account','whatsapp_conversacion','whatsapp_mensaje',
    'whatsapp_bot_config','whatsapp_plantilla','whatsapp_programado'
  ] loop
    if not exists (
      select 1 from pg_trigger
      where tgname = 'trg_' || t || '_updated' and tgrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        'trg_' || t || '_updated', t
      );
    end if;
  end loop;
end$$;

-- ---------- RLS (mismo patrón del resto del schema). El service role (webhook/cron) la bypassea. ----------
do $$
declare t text;
begin
  foreach t in array array[
    'whatsapp_account','whatsapp_conversacion','whatsapp_mensaje',
    'whatsapp_bot_config','whatsapp_plantilla','whatsapp_programado','whatsapp_evento_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_sel') then
      execute format('create policy %I on public.%I for select using (empresa_id = public.auth_empresa_id())', t||'_sel', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_ins') then
      execute format('create policy %I on public.%I for insert with check (empresa_id = public.auth_empresa_id())', t||'_ins', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_upd') then
      execute format('create policy %I on public.%I for update using (empresa_id = public.auth_empresa_id()) with check (empresa_id = public.auth_empresa_id())', t||'_upd', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_del') then
      execute format('create policy %I on public.%I for delete using (empresa_id = public.auth_empresa_id())', t||'_del', t);
    end if;
  end loop;
end$$;
