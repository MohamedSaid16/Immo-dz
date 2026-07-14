import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { LeadTracker } from "@/components/seo/lead-tracker";
import { getSiteUrl } from "@/lib/site-url";
import { Suspense } from "react";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Immo DZ — La plateforme immobilière algérienne | منصة العقارات",
    template: "Immo DZ | %s",
  },
  description:
    "Immo DZ — la première plateforme immobilière algérienne. Achat, vente et location d'appartements, villas, locaux et terrains dans les 58 wilayas. أول منصة عقارية جزائرية متكاملة.",
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    siteName: "Immo DZ",
    title: "Immo DZ — La plateforme immobilière algérienne",
    description:
      "Achat, vente et location de biens immobiliers partout en Algérie. البحث عن العقارات في كل الولايات.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Immo DZ — La plateforme immobilière algérienne",
    description:
      "Achat, vente et location de biens immobiliers partout en Algérie.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <LeadTracker />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
