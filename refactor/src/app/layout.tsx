import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Display, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth/context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

/*
 * Branding multi-scuola.
 * NEXT_PUBLIC_BRAND       — chiave del tema CSS in src/themes/<brand>.css (default: "aciief")
 * NEXT_PUBLIC_BRAND_NAME  — nome scuola mostrato nel <title> (default: "ACIIEF")
 * Per aggiungere una scuola vedi Docs/CAMBIO-THEMA.md
 */
const BRAND = process.env.NEXT_PUBLIC_BRAND ?? "aciief";
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "ACIIEF";

export const metadata: Metadata = {
  title: `Registro Elettronico - ${BRAND_NAME}`,
  description: "Registro elettronico scolastico - giua@school",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" data-theme={BRAND}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSerif.variable} ${dmSans.variable} antialiased`}
      >
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
