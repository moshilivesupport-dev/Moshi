import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { PWARegister } from "@/components/layout/PWARegister";
import { SplashProvider } from "@/components/splash/SplashProvider";

export const metadata: Metadata = {
  title: "Moshi – Live Shopping Platform",
  description: "Achetez et vendez en direct. Coins, gifts, multi-devises, multi-langues.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Moshi",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff4d4d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-onyx text-white antialiased">
        <SplashProvider>
          <Navbar />
          <main className="pt-0 md:pt-16 pb-20 md:pb-8 min-h-screen">
            {children}
          </main>
          <PWARegister />
        </SplashProvider>
      </body>
    </html>
  );
}
