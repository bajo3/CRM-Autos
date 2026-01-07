import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen overflow-x-hidden">
        <div className="flex min-w-0">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 overflow-x-hidden">{children}</main>
        </div>
        <MobileNav />
      </div>
    </RequireAuth>
  );
}
