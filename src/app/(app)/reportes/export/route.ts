import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";

/** Escapa un valor para CSV (comillas + comas + saltos de línea). */
function celda(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function aCsv(headers: string[], filas: (string | number | null)[][]): string {
  const lineas = [headers.join(";"), ...filas.map((f) => f.map(celda).join(";"))];
  // BOM para que Excel (es-AR) detecte UTF-8 y el ; como separador.
  return "﻿" + lineas.join("\r\n");
}

function descargar(nombre: string, csv: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!can(ctx.profile.rol, "reportes.ver")) {
    return new NextResponse("Sin permiso para exportar.", { status: 403 });
  }

  const sb = createClient();
  const { searchParams } = request.nextUrl;
  const tipo = searchParams.get("tipo") ?? "ventas";
  const hoy = new Date().toISOString().slice(0, 10);

  if (tipo === "ventas") {
    const desde = searchParams.get("desde") ?? "1900-01-01";
    const hasta = searchParams.get("hasta") ?? "2999-12-31";
    type V = {
      fecha_venta: string;
      precio_final: number | null;
      sena: number | null;
      saldo: number | null;
      forma_pago: string;
      estado_entrega: string;
      cliente: Rel<{ nombre: string; apellido: string }>;
      vehiculo: Rel<{ marca: string; modelo: string; anio: number | null }>;
      vendedor: Rel<{ nombre: string; apellido: string }>;
    };
    const { data } = await sb
      .from("venta")
      .select(
        "fecha_venta,precio_final,sena,saldo,forma_pago,estado_entrega," +
          "cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo,anio)," +
          "vendedor:vendedor_id(nombre,apellido)",
      )
      .gte("fecha_venta", desde)
      .lte("fecha_venta", hasta)
      .order("fecha_venta", { ascending: false })
      .returns<V[]>();
    const filas = (data ?? []).map((v) => {
      const c = rel(v.cliente);
      const veh = rel(v.vehiculo);
      const vend = rel(v.vendedor);
      return [
        v.fecha_venta,
        c ? `${c.nombre} ${c.apellido}`.trim() : "",
        veh ? `${veh.marca} ${veh.modelo} ${veh.anio ?? ""}`.trim() : "",
        vend ? `${vend.nombre} ${vend.apellido}`.trim() : "",
        v.forma_pago,
        v.precio_final ?? 0,
        v.sena ?? 0,
        v.saldo ?? 0,
        v.estado_entrega,
      ];
    });
    const csv = aCsv(
      ["Fecha", "Cliente", "Vehículo", "Vendedor", "Forma de pago", "Precio", "Seña", "Saldo", "Entrega"],
      filas,
    );
    return descargar(`ventas_${hoy}.csv`, csv);
  }

  if (tipo === "stock") {
    type S = {
      marca: string;
      modelo: string;
      version: string | null;
      anio: number | null;
      kilometros: number | null;
      patente: string | null;
      estado: string;
      estado_documental: string;
      precio_venta: number | null;
      precio_costo: number | null;
    };
    const { data } = await sb
      .from("vehiculo")
      .select(
        "marca,modelo,version,anio,kilometros,patente,estado,estado_documental,precio_venta,precio_costo",
      )
      .order("created_at", { ascending: false })
      .returns<S[]>();
    const verCostos = can(ctx.profile.rol, "costos.ver");
    const filas = (data ?? []).map((v) => [
      v.marca,
      v.modelo,
      v.version ?? "",
      v.anio ?? "",
      v.kilometros ?? "",
      v.patente ?? "",
      v.estado,
      v.estado_documental,
      v.precio_venta ?? 0,
      verCostos ? v.precio_costo ?? 0 : "",
    ]);
    const csv = aCsv(
      ["Marca", "Modelo", "Versión", "Año", "Km", "Patente", "Estado", "Documentación", "Precio venta", "Precio costo"],
      filas,
    );
    return descargar(`stock_${hoy}.csv`, csv);
  }

  if (tipo === "clientes") {
    type C = {
      nombre: string;
      apellido: string;
      telefono: string | null;
      email: string | null;
      estado: string;
      origen: string | null;
      created_at: string;
    };
    const { data } = await sb
      .from("cliente")
      .select("nombre,apellido,telefono,email,estado,origen,created_at")
      .order("created_at", { ascending: false })
      .returns<C[]>();
    const filas = (data ?? []).map((c) => [
      c.nombre,
      c.apellido,
      c.telefono ?? "",
      c.email ?? "",
      c.estado,
      c.origen ?? "",
      c.created_at?.slice(0, 10) ?? "",
    ]);
    const csv = aCsv(["Nombre", "Apellido", "Teléfono", "Email", "Estado", "Origen", "Alta"], filas);
    return descargar(`clientes_${hoy}.csv`, csv);
  }

  return new NextResponse("Tipo de export no válido.", { status: 400 });
}
