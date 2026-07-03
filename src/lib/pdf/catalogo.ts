/**
 * Generador de catálogo de stock en PDF (pdf-lib).
 *
 * Portada de marca + fichas de vehículo (foto grande + specs + precio),
 * 2 por página. Pensado para compartir por WhatsApp (bucket público).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export type EmpresaCat = {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  color_primario?: string | null;
  logoBytes?: Uint8Array | null;
  /** Link absoluto a la vitrina pública (https://.../p/slug), si la empresa tiene slug configurado. */
  linkVitrina?: string | null;
};

export type VehiculoCat = {
  marca: string; modelo: string; version?: string | null; anio?: number | null;
  kilometros?: number | null; combustible?: string | null; transmision?: string | null;
  color?: string | null; precio_venta?: number | null;
  fotoBytes?: Uint8Array | null;
};

const A4 = { w: 595.28, h: 841.89 };
const M = 40;
const INK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.82, 0.84, 0.87);
const BRAND_DEFAULT = rgb(0.118, 0.227, 0.541); // brand-800 aprox.

function brandColor(hex: string | null | undefined) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex ?? "");
  if (!m) return BRAND_DEFAULT;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const PER_PAGE = 2;
const HEADER_BOTTOM = A4.h - 90;
const SLOT_H = (HEADER_BOTTOM - 70) / PER_PAGE;

const TYPO_MAP: Record<string, string> = {
  "—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...",
};
function safe(s: unknown): string {
  const withTypo = String(s ?? "").replace(/[—–‘’“”…]/g, (c) => TYPO_MAP[c]);
  return withTypo.replace(/[^\x00-\xFF]/g, "?");
}
function ars(n: number | null | undefined): string {
  if (n == null) return "Consultar";
  return `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;
}
function num(n: number | null | undefined): string {
  return n == null ? "—" : new Intl.NumberFormat("es-AR").format(n);
}
function fechaAR(iso: string): string {
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function embedFoto(pdf: PDFDocument, bytes: Uint8Array | null | undefined): Promise<PDFImage | null> {
  if (!bytes || bytes.length < 4) return null;
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}

function drawPortada(
  pdf: PDFDocument, empresa: EmpresaCat, opts: { titulo: string; fecha: string },
  cantidad: number, font: PDFFont, bold: PDFFont, BRAND: ReturnType<typeof rgb>, logo: PDFImage | null,
) {
  const page = pdf.addPage([A4.w, A4.h]);
  const blockH = A4.h * 0.52;
  page.drawRectangle({ x: 0, y: A4.h - blockH, width: A4.w, height: blockH, color: BRAND });

  let y = A4.h - 110;
  if (logo) {
    const maxW = 170, maxH = 90;
    const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
    const iw = logo.width * scale, ih = logo.height * scale;
    page.drawImage(logo, { x: (A4.w - iw) / 2, y: y - ih, width: iw, height: ih });
    y -= ih + 34;
  }
  const nombre = safe(empresa.nombre);
  const nameSize = nombre.length > 28 ? 22 : 28;
  page.drawText(nombre, {
    x: (A4.w - bold.widthOfTextAtSize(nombre, nameSize)) / 2, y, size: nameSize, font: bold, color: rgb(1, 1, 1),
  });
  y -= 34;
  const sub = "Catálogo de vehículos";
  page.drawText(sub, {
    x: (A4.w - font.widthOfTextAtSize(sub, 13)) / 2, y, size: 13, font, color: rgb(0.88, 0.9, 0.97),
  });

  let by = A4.h - blockH - 64;
  const fechaTxt = `Actualizado al ${fechaAR(opts.fecha)}`;
  page.drawText(fechaTxt, {
    x: (A4.w - font.widthOfTextAtSize(fechaTxt, 11)) / 2, y: by, size: 11, font, color: GREY,
  });
  by -= 26;
  const countTxt = `${cantidad} unidad${cantidad === 1 ? "" : "es"} disponible${cantidad === 1 ? "" : "s"}`;
  page.drawText(countTxt, {
    x: (A4.w - bold.widthOfTextAtSize(countTxt, 17)) / 2, y: by, size: 17, font: bold, color: INK,
  });

  const contacto = [empresa.telefono ? `Tel ${empresa.telefono}` : null, empresa.email,
    [empresa.direccion, empresa.localidad].filter(Boolean).join(", ") || null]
    .filter(Boolean).join("  ·  ");
  if (contacto) {
    page.drawLine({ start: { x: M, y: 76 }, end: { x: A4.w - M, y: 76 }, thickness: 1, color: RULE });
    page.drawText(safe(contacto), {
      x: (A4.w - font.widthOfTextAtSize(safe(contacto), 9)) / 2, y: 56, size: 9, font, color: GREY,
    });
  }
}

export async function generarCatalogoPdf(
  empresa: EmpresaCat,
  vehiculos: VehiculoCat[],
  opts: { titulo: string; fecha: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const BRAND = brandColor(empresa.color_primario);
  const logo = await embedFoto(pdf, empresa.logoBytes);

  drawPortada(pdf, empresa, opts, vehiculos.length, font, bold, BRAND, logo);

  const totalPages = 2 + Math.max(1, Math.ceil(vehiculos.length / PER_PAGE));
  let pageNum = 1;

  const header = (page: PDFPage) => {
    page.drawRectangle({ x: 0, y: A4.h - 60, width: A4.w, height: 60, color: BRAND });
    page.drawText(safe(empresa.nombre), { x: M, y: A4.h - 38, size: 16, font: bold, color: rgb(1, 1, 1) });
    const sub = safe(opts.titulo);
    page.drawText(sub, { x: M, y: A4.h - 54, size: 9, font, color: rgb(0.85, 0.88, 0.95) });
    const right = `${fechaAR(opts.fecha)}`;
    page.drawText(right, { x: A4.w - M - font.widthOfTextAtSize(right, 9), y: A4.h - 38, size: 9, font, color: rgb(0.85, 0.88, 0.95) });
  };

  const footer = (page: PDFPage, n: number) => {
    const contacto = [empresa.telefono ? `Tel ${empresa.telefono}` : null, empresa.email,
      [empresa.direccion, empresa.localidad].filter(Boolean).join(", ") || null]
      .filter(Boolean).join("  ·  ");
    page.drawLine({ start: { x: M, y: 44 }, end: { x: A4.w - M, y: 44 }, thickness: 1, color: RULE });
    page.drawText(safe(contacto), { x: M, y: 32, size: 8, font, color: GREY });
    const pg = `Página ${n} de ${totalPages}`;
    page.drawText(pg, { x: A4.w - M - font.widthOfTextAtSize(pg, 8), y: 32, size: 8, font, color: GREY });
  };

  const newPage = (): PDFPage => {
    const page = pdf.addPage([A4.w, A4.h]);
    pageNum += 1;
    header(page);
    footer(page, pageNum);
    return page;
  };

  if (vehiculos.length === 0) {
    const page = newPage();
    page.drawText("No hay vehículos en este catálogo.", { x: M, y: HEADER_BOTTOM - 30, size: 12, font, color: GREY });
  } else {
    for (let i = 0; i < vehiculos.length; i++) {
      const slot = i % PER_PAGE;
      const page = slot === 0 ? newPage() : pdf.getPage(pdf.getPageCount() - 1);
      const top = HEADER_BOTTOM - slot * SLOT_H;
      await drawCard(pdf, page, vehiculos[i], top, font, bold, BRAND);
    }
  }

  drawCierre(pdf, empresa, font, bold, BRAND, logo);

  return pdf.save();
}

/** Página final: contacto + link a la vitrina pública, para que el catálogo nunca sea un callejón sin salida. */
function drawCierre(
  pdf: PDFDocument, empresa: EmpresaCat, font: PDFFont, bold: PDFFont, BRAND: ReturnType<typeof rgb>, logo: PDFImage | null,
) {
  const page = pdf.addPage([A4.w, A4.h]);
  const blockH = A4.h * 0.4;
  page.drawRectangle({ x: 0, y: A4.h - blockH, width: A4.w, height: blockH, color: BRAND });

  let y = A4.h - 90;
  if (logo) {
    const maxW = 130, maxH = 60;
    const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
    const iw = logo.width * scale, ih = logo.height * scale;
    page.drawImage(logo, { x: (A4.w - iw) / 2, y: y - ih, width: iw, height: ih });
    y -= ih + 24;
  }
  const gracias = "¡Gracias por tu interés!";
  page.drawText(gracias, {
    x: (A4.w - bold.widthOfTextAtSize(gracias, 22)) / 2, y, size: 22, font: bold, color: rgb(1, 1, 1),
  });
  y -= 28;
  const sub = "Este stock cambia todo el tiempo — mirá las unidades actualizadas cuando quieras:";
  const subLines = wrapCentrado(sub, font, 11, A4.w - 2 * M);
  for (const line of subLines) {
    page.drawText(line, { x: (A4.w - font.widthOfTextAtSize(line, 11)) / 2, y, size: 11, font, color: rgb(0.88, 0.9, 0.97) });
    y -= 16;
  }

  let by = A4.h - blockH - 60;
  if (empresa.linkVitrina) {
    const link = safe(empresa.linkVitrina);
    page.drawText(link, {
      x: (A4.w - bold.widthOfTextAtSize(link, 15)) / 2, y: by, size: 15, font: bold, color: BRAND,
    });
    by -= 40;
  }

  const contactos = [
    empresa.telefono ? `WhatsApp / Tel: ${empresa.telefono}` : null,
    empresa.email ? `Email: ${empresa.email}` : null,
    [empresa.direccion, empresa.localidad, empresa.provincia].filter(Boolean).join(", ") || null,
  ].filter(Boolean) as string[];
  for (const c of contactos) {
    const s = safe(c);
    page.drawText(s, { x: (A4.w - font.widthOfTextAtSize(s, 11)) / 2, y: by, size: 11, font, color: INK });
    by -= 18;
  }
}

/** Parte un texto en líneas centradas que entran en `maxW`. */
function wrapCentrado(s: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = safe(s).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function drawCard(
  pdf: PDFDocument, page: PDFPage, v: VehiculoCat, top: number, font: PDFFont, bold: PDFFont, BRAND: ReturnType<typeof rgb>,
) {
  const cardH = SLOT_H - 16;
  const x = M;
  const w = A4.w - 2 * M;
  const yBottom = top - cardH;

  page.drawRectangle({ x, y: yBottom, width: w, height: cardH, borderColor: RULE, borderWidth: 1, color: rgb(1, 1, 1) });

  // ---- Foto (izquierda, agrandada) ----
  const boxX = x + 14, boxY = yBottom + 14, boxW = 270, boxH = cardH - 28;
  const img = await embedFoto(pdf, v.fotoBytes);
  if (img) {
    const scale = Math.min(boxW / img.width, boxH / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    page.drawImage(img, { x: boxX + (boxW - iw) / 2, y: boxY + (boxH - ih) / 2, width: iw, height: ih });
  } else {
    page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(0.95, 0.96, 0.97) });
    page.drawText("Sin foto", { x: boxX + boxW / 2 - 20, y: boxY + boxH / 2 - 5, size: 10, font, color: GREY });
  }

  // ---- Datos (derecha) ----
  const tx = x + boxW + 32;
  let ty = top - 34;
  const titulo = `${v.marca} ${v.modelo}${v.anio ? ` ${v.anio}` : ""}`;
  page.drawText(safe(titulo), { x: tx, y: ty, size: 17, font: bold, color: INK });
  ty -= 20;
  if (v.version) { page.drawText(safe(v.version), { x: tx, y: ty, size: 10, font, color: GREY }); ty -= 22; }
  else ty -= 8;

  const specs = [
    v.kilometros != null ? `${num(v.kilometros)} km` : null,
    v.combustible ? safe(v.combustible) : null,
    v.transmision ? safe(v.transmision) : null,
    v.color ? safe(v.color) : null,
  ].filter(Boolean);
  for (const s of specs) {
    page.drawText(`•  ${s}`, { x: tx, y: ty, size: 11, font, color: INK });
    ty -= 18;
  }

  // Precio
  page.drawText(ars(v.precio_venta), { x: tx, y: yBottom + 22, size: 22, font: bold, color: BRAND });
}
