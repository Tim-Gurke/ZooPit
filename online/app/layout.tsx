import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZooPit – Kleine Tiere, große Logik",
  description: "Werbefreie Tier-Logikrätsel und ZooPit-iaden mit Freunden.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
