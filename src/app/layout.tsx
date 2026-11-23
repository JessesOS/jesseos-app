import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "JesseOS Dashboard",
  description: "Read-only operating dashboard for JesseOS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${instrument.variable}`}>
      <body className="min-h-full bg-[var(--paper)]">{children}</body>
    </html>
  );
}
