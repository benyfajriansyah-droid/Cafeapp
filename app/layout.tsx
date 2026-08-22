import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://famz-coffee-os.benyfm.chatgpt.site"),
  title: "Famz Coffee OS",
  description: "POS, stok, shift kas, dan laporan laba untuk operasional kedai kopi.",
  openGraph: {
    title: "Famz Coffee OS",
    description: "POS, stok, dan laba dalam satu tempat.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Famz Coffee OS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Famz Coffee OS",
    description: "POS, stok, dan laba dalam satu tempat.",
    images: ["/og.png"],
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
