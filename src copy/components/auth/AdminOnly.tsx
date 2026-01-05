"use client";

import { useAuth } from "@/features/auth/AuthProvider";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { role, profileLoading } = useAuth();
  if (profileLoading && !role) return null;
  if (role !== "admin") return null;
  return <>{children}</>;
}
