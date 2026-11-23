import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian",
});

export const metadata: Metadata = {
  title: "JesseOS",
  description: "Read-only operating dashboard for JesseOS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${archivo.variable} ${martian.variable}`}>
      <body className="min-h-full bg-[var(--paper)]">{children}</body>
    </html>
  );
}
