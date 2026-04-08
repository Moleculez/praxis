"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Nav } from "@/components/nav";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <Nav />
      <main className="md:ml-56 min-h-screen max-w-screen-2xl p-6 md:p-8 overflow-auto">
        {children}
      </main>
    </AuthGuard>
  );
}
