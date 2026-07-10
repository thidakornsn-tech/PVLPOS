import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Powerlife Inventory",
  description: "Event POS System — Inventory, POS, Dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
