"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DataProvider } from "@/lib/data-provider";
import { Toaster } from "sonner";
import { AlertNotifier } from "@/components/alert-notifier";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <DataProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <AlertNotifier />
        </DataProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
