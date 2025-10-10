import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "dYdX Alert Dashboard",
  description: "Configure liquidation and deleveraging alerts for dYdX subaccounts.",
};

const GA_MEASUREMENT_ID = "G-X5DTFRB1J4";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>

        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
