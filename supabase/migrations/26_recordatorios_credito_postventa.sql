-- Columnas de control para automatizar recordatorios de cuota y renovación
-- por WhatsApp, sin duplicar envíos entre corridas diarias del cron.
alter table credito add column if not exists recordatorio_cuota_mes text;
alter table credito add column if not exists mensaje_renovacion_enviado boolean not null default false;
alter table postventa add column if not exists mensaje_enviado boolean not null default false;
