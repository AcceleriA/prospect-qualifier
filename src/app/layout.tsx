import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prospect Qualifier | AcceleriA",
  description:
    "Qualifie tes prospects LinkedIn avec l'IA. Score ICP, signaux d'intention et message d'accroche personnalise.",
  openGraph: {
    title: "Prospect Qualifier | AcceleriA",
    description:
      "Qualifie tes prospects LinkedIn avec l'IA. Score ICP, signaux d'intention et message d'accroche personnalise.",
    type: "website",
    siteName: "AcceleriA",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
