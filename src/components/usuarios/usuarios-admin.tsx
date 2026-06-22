"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  invitarUsuario, cambiarRol, cambiarEstado, type InviteState,
} from "@/app/(app)/usuarios/actions";
import { ROLES } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Label } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { humanize } from "@/lib/format";

export type Usuario = {
  id: string; nombre: string; apellido: string; email: string | null;
  telefono: string | null; rol: string; activo: boolean;
};

function SubmitMini({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

function InviteForm() {
  const [state, formAction] = useFormState<InviteState, FormData>(invitarUsuario, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Invitar usuario</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Se envía una invitación por email. El usuario queda asociado a esta empresa con el rol elegido.
        </p>
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required placeholder="vendedor@agencia.com" />
            {fe.email && <p className="mt-1 text-xs text-danger">{fe.email}</p>}
          </div>
          <div>
            <Label htmlFor="rol">Rol *</Label>
            <Select id="rol" name="rol" defaultValue="vendedor">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" placeholder="Juan" />
          </div>
          <div>
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" name="apellido" placeholder="Pérez" />
          </div>
          {state.error && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          {state.ok && (
            <p className="sm:col-span-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.ok}</p>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <SubmitInvite />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitInvite() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar invitación"}</Button>;
}

export function UsuariosAdmin({
  usuarios, currentUserId, puede,
}: {
  usuarios: Usuario[]; currentUserId: string | undefined; puede: boolean;
}) {
  return (
    <div>
      {puede && <InviteForm />}

      <div className="rounded-lg border bg-card">
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH><TH>Email</TH><TH>Teléfono</TH><TH>Rol</TH><TH>Estado</TH>
              {puede && <TH>Acciones</TH>}
            </TR>
          </THead>
          <TBody>
            {usuarios.map((u) => {
              const esYo = u.id === currentUserId;
              return (
                <TR key={u.id}>
                  <TD className="font-medium">{u.nombre} {u.apellido}{esYo ? " (vos)" : ""}</TD>
                  <TD>{u.email ?? "—"}</TD>
                  <TD>{u.telefono ?? "—"}</TD>
                  <TD>
                    {puede && !esYo ? (
                      <form action={cambiarRol} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={u.id} />
                        <Select name="rol" defaultValue={u.rol} className="h-8 w-auto">
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </Select>
                        <SubmitMini label="Guardar" />
                      </form>
                    ) : (
                      <Badge tone="info">{humanize(u.rol)}</Badge>
                    )}
                  </TD>
                  <TD>{u.activo ? <Badge tone="ok">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}</TD>
                  {puede && (
                    <TD>
                      {!esYo && (
                        <form action={cambiarEstado}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="activo" value={u.activo ? "false" : "true"} />
                          <SubmitMini label={u.activo ? "Desactivar" : "Activar"} />
                        </form>
                      )}
                    </TD>
                  )}
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
