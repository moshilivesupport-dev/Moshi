import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moshi",
  description: "Live Shopping Social",
  applicationName: "Moshi",
  appleWebApp: {
    capable: true,
    title: "Moshi",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const metadata: Metadata = {
  title: "Moshi – Soft Social Commerce",
  description: "La plateforme de live shopping immersive et sociale.",
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-[100dvh] bg-moshi-bg text-moshi-text antialiased">
        {/* On ajoute un padding en bas pour ne pas cacher le contenu sous la nav */}
        <div className="pb-[72px]">
          {children}
        </div>
        
        {/* LA BARRE DE NAVIGATION */}
        <BottomNav />
      </body>
    </html>
  );
}