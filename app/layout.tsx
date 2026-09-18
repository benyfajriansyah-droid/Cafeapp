import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dkriuk Cafe App",
  description: "Kasir, produk, stok, laporan, dan akses karyawan Dkriuk.",
  openGraph: {
    title: "Dkriuk Cafe App",
    description: "Aplikasi operasional Dkriuk.",
  },
  twitter: {
    card: "summary",
    title: "Dkriuk Cafe App",
    description: "Aplikasi operasional Dkriuk.",
  },
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
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
