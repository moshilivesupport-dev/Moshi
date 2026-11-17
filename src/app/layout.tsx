
import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Moshi – Soft Social Commerce",
  description: "La plateforme de live shopping immersive et sociale.",
  applicationName: "Moshi",
  appleWebApp: {
    capable: true,
    title: "Moshi",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#F9FAFB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-[100dvh] bg-moshi-bg text-moshi-text antialiased">
        <div className="pb-[72px]">
          {children}
        </div>

        {modal}

        <BottomNav />
      </body>
    </html>
  );
}
