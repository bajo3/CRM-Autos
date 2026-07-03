import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionContext } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getSessionContext();
  const empresa = ctx?.empresa?.nombre;
  return { title: empresa ? `${empresa} · CRM Automotor` : "CRM Automotor" };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const nombre = `${ctx.profile?.nombre ?? ""} ${ctx.profile?.apellido ?? ""}`.trim();

  return (
    <div className="min-h-screen">
      <AppSidebar empresaNombre={ctx.empresa?.nombre ?? "Mi agencia"} />
      <div className="lg:pl-64">
        <Topbar nombre={nombre} rol={ctx.profile?.rol ?? "—"} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
