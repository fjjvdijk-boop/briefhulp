import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible is ontworpen voor mensen die slecht zien: letters zijn makkelijk uit elkaar te houden.
const font = Atkinson_Hyperlegible({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Briefhulp – brieven simpel uitgelegd",
  description:
    "Maak een foto van een brief van de Belastingdienst, gemeente, verzekeraar of incassobureau. Briefhulp legt in gewone taal uit wat er staat en wat u moet doen.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Briefhulp", statusBarStyle: "default" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b3fa6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={font.className}>{children}</body>
    </html>
  );
}
