import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">{children}</main>
        </div>
        <MobileNav />
      </div>
    </RequireAuth>
  );
}
