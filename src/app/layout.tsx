import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guru Pintar AI | Aplikasi Pembuat RPP Otomatis",
  description: "Buat RPP dan Modul Ajar Kurikulum Merdeka hanya dalam hitungan detik. Menggunakan kecerdasan buatan (AI) canggih yang disesuaikan untuk guru di Indonesia.",
  authors: [{ name: "Susetiadi" }],
  keywords: ["RPP Otomatis", "Modul Ajar AI", "Kurikulum Merdeka", "Guru Pintar", "Pendidikan Indonesia", "Deep Learning"],
  openGraph: {
    title: "Guru Pintar AI - RPP & Modul Ajar Otomatis",
    description: "Revolusi cara mengajar Anda! Buat RPP Kurikulum Merdeka yang mendalam dan berpusat pada siswa hanya dengan sekali klik.",
    url: "https://gurupintarai.vercel.app", // Bisa diganti dengan domain asli nanti
    siteName: "Guru Pintar AI",
    images: [
      {
        // Gambar thumbnail default bertema pendidikan dari Unsplash
        url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop", 
        width: 1200,
        height: 630,
        alt: "Guru Pintar AI Banner",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guru Pintar AI - RPP & Modul Ajar Otomatis",
    description: "Buat RPP Kurikulum Merdeka hanya dalam hitungan detik dengan bantuan AI.",
    images: ["https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
