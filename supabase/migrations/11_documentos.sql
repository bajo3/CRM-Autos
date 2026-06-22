-- =============================================================
-- 11_documentos — Numeración interna correlativa de documentos
-- comerciales + bucket privado de PDFs.
-- =============================================================

-- ---------- Secuencia por empresa + tipo de documento ----------
create table public.documento_secuencia (
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  tipo       tipo_doc_comercial not null,
  ultimo     int not null default 0,
  primary key (empresa_id, tipo)
);

alter table public.documento_secuencia enable row level security;
-- Solo lectura para la empresa; la escritura ocurre vía trigger (security definer).
create policy documento_secuencia_sel on public.documento_secuencia
  for select using (empresa_id = public.auth_empresa_id());

-- ---------- Asignación de número correlativo al insertar ----------
create or replace function public.asignar_numero_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_num int;
begin
  -- Respeta un número ya provisto; si no, lo genera correlativo por empresa+tipo.
  if new.numero is not null and length(trim(new.numero)) > 0 then
    return new;
  end if;

  insert into public.documento_secuencia as ds (empresa_id, tipo, ultimo)
       values (new.empresa_id, new.tipo, 1)
  on conflict (empresa_id, tipo)
       do update set ultimo = ds.ultimo + 1
    returning ds.ultimo into v_num;

  new.numero := lpad(v_num::text, 5, '0');
  return new;
end$$;

revoke execute on function public.asignar_numero_documento() from anon, authenticated, public;

drop trigger if exists trg_doccom_numero on public.documento_comercial;
create trigger trg_doccom_numero
  before insert on public.documento_comercial
  for each row execute function public.asignar_numero_documento();

-- ---------- Bucket privado de documentos. Path: {empresa_id}/{archivo} ----------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "documentos_read" on storage.objects
  for select using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );

create policy "documentos_insert" on storage.objects
  for insert with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );

create policy "documentos_delete" on storage.objects
  for delete using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = public.auth_empresa_id()::text
  );
