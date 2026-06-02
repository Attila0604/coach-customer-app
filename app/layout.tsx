import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RGYM — Mitglieder",
  description: "Dein persönlicher Bereich.",
  manifest: "/manifest.webmanifest",
  applicationName: "RGYM",
  appleWebApp: {
    capable: true,
    title: "RGYM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#10151D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${oswald.variable} ${inter.variable}`}>
      <body className="bg-ink-900 text-bone font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
