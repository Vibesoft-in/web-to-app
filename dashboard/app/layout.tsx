import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turn Your Website into iOS & Android Mobile Apps — AppifyHub",
  description: "Turn your WordPress, WooCommerce or Shopify website into a beautiful mobile app — quickly, easily and without coding.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { Providers } from "@/components/providers/query-provider";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="stylesheet" href="/assets/css/app.css" />
      </head>
      <body className="antialiased site-layout">
        <Providers>{children}</Providers>
        <Script src="/assets/js/app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

