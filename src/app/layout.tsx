import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--paper)]">{children}</body>
    </html>
  );
}
