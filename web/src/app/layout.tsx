import type { Metadata } from "next";
import { Anton, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GenLayerProvider } from "@/components/GenLayerProvider";
import { WalletModal } from "@/components/WalletModal";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "BackIt — Put up or shut up",
  description:
    "Same-session live-web primitive on GenLayer StudioNet. Lock test GEN on one sentence and one HTTPS URL. Anyone can prove. Not a court.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
        <GenLayerProvider>
          <Header />
          <main className="w-full pt-20 bg-surface min-h-screen flex-1">{children}</main>
          <Footer />
          <WalletModal />
        </GenLayerProvider>
      </body>
    </html>
  );
}
