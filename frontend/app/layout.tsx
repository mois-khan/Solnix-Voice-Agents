import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500"],
  variable: "--font-noto-devanagari",
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "500"],
  variable: "--font-noto-telugu",
});

export const metadata: Metadata = {
  title: "Solnix AI Voice Agents",
  description:
    "Talk to an AI voice agent. Live. In your language. Three personas. Hindi. Telugu. English. Powered by Sarvam AI + Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} ${notoTelugu.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
