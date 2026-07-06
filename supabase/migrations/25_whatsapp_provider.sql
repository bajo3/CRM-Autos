-- Agrega el transporte de envío/recepción de la cuenta de WhatsApp de cada empresa.
-- 'meta': Cloud API oficial de Meta (Embedded Signup o alta manual, requiere access_token_encrypted).
-- 'baileys': bridge no oficial por QR (beta), usado mientras la verificación de negocio de Meta
-- está pendiente. El día que se apruebe la API oficial, el cambio es solo flip de este valor.
alter table public.whatsapp_account
  add column if not exists provider text not null default 'meta';

comment on column public.whatsapp_account.provider is
  'Transporte de la cuenta de WhatsApp: ''meta'' (Cloud API oficial) | ''baileys'' (bridge QR, beta no oficial).';
