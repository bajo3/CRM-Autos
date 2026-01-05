export type Vehicle = {
  id: string;
  title: string;
  year: number;
  km: number;
  brand: string;
  model: string;
  version: string;
  priceARS: number;
  status: "published" | "draft" | "reserved" | "sold";
  color?: string;
  transmission?: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  interest: string;
  stage: "new" | "contacted" | "visit" | "negotiation" | "won" | "lost";
  lastContact: string; // ISO
};

export type Credit = {
  id: string;
  customer: string;
  vehicle: string;
  amountARS: number;
  termMonths: number;
  status: "active" | "pending" | "closed";
  nextDue: string; // ISO
};

export type Task = {
  id: string;
  title: string;
  due: string; // ISO
  priority: "low" | "medium" | "high";
  status: "open" | "done" | "canceled";
};

const now = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

export const vehicles: Vehicle[] = [
  {
    id: "v1",
    title: "Volkswagen Suran 1.6 Comfortline",
    year: 2016,
    km: 98000,
    brand: "Volkswagen",
    model: "Suran",
    version: "Comfortline 1.6",
    priceARS: 12800000,
    status: "published",
    color: "Gris",
    transmission: "Manual",
  },
  {
    id: "v2",
    title: "Ford Focus SE Plus",
    year: 2018,
    km: 74000,
    brand: "Ford",
    model: "Focus",
    version: "SE Plus 2.0",
    priceARS: 16500000,
    status: "reserved",
    color: "Blanco",
    transmission: "Automática",
  },
  {
    id: "v3",
    title: "Chevrolet Onix LT",
    year: 2020,
    km: 52000,
    brand: "Chevrolet",
    model: "Onix",
    version: "LT 1.0",
    priceARS: 14900000,
    status: "draft",
    color: "Azul",
    transmission: "Manual",
  },
  {
    id: "v4",
    title: "Volkswagen Vento 2.0T",
    year: 2014,
    km: 120000,
    brand: "Volkswagen",
    model: "Vento",
    version: "2.0T",
    priceARS: 17900000,
    status: "published",
    color: "Negro",
    transmission: "DSG",
  },
];

export const leads: Lead[] = [
  { id: "l1", name: "Martina", phone: "+54 9 2494 123-456", interest: "Suran 2016", stage: "contacted", lastContact: iso(addDays(-1)) },
  { id: "l2", name: "Pablo", phone: "+54 9 2494 222-333", interest: "Vento 2.0T", stage: "negotiation", lastContact: iso(addDays(-3)) },
  { id: "l3", name: "Sofía", phone: "+54 9 2494 444-555", interest: "Onix 2020", stage: "new", lastContact: iso(addDays(-0.2)) },
  { id: "l4", name: "Lucas", phone: "+54 9 2494 666-777", interest: "Focus 2018", stage: "visit", lastContact: iso(addDays(-2)) },
];

export const credits: Credit[] = [
  { id: "c1", customer: "Martina", vehicle: "Suran 2016", amountARS: 5800000, termMonths: 18, status: "active", nextDue: iso(addDays(12)) },
  { id: "c2", customer: "Lucas", vehicle: "Focus 2018", amountARS: 9200000, termMonths: 24, status: "pending", nextDue: iso(addDays(5)) },
  { id: "c3", customer: "Sofía", vehicle: "Onix 2020", amountARS: 7100000, termMonths: 12, status: "closed", nextDue: iso(addDays(-30)) },
];

export const tasks: Task[] = [
  { id: "t1", title: "Responder consulta Suran (WhatsApp)", due: iso(addDays(0.3)), priority: "high", status: "open" },
  { id: "t2", title: "Publicar fotos Vento en ML", due: iso(addDays(1)), priority: "medium", status: "open" },
  { id: "t3", title: "Llamar a Lucas (test drive)", due: iso(addDays(0.7)), priority: "medium", status: "open" },
  { id: "t4", title: "Actualizar precio Onix", due: iso(addDays(2)), priority: "low", status: "done" },
];

export function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function formatDateTime(isoStr: string) {
  const d = new Date(isoStr);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
