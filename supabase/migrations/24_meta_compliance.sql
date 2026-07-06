-- =============================================================
-- 24_meta_compliance — soporte para los callbacks de cumplimiento
-- de Meta (deauthorize + data deletion request), requeridos para
-- App Review de Facebook Login for Business / WhatsApp Embedded Signup.
--
-- Meta llama a estos callbacks identificando al usuario de Facebook que
-- autorizó la app (fb_user_id), no al WABA/número. Sin guardar ese id al
-- conectar, no hay forma de ubicar qué empresa debe desconectarse.
-- Aditivo: solo agrega una columna nullable + su índice.
-- =============================================================

alter table public.whatsapp_account add column if not exists fb_user_id text;
create index if not exists idx_wa_account_fb_user on public.whatsapp_account(fb_user_id);
