"use client";

import { ToastProvider } from "@dcos/ui";
import { AuthProvider } from "@/lib/auth/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
