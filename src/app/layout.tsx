import type { Metadata, Viewport } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}