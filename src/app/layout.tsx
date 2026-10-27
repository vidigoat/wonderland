import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque, Fraunces, Geist, Geist_Mono } from "next/font/google";
import { siteOrigin } from "@/lib/site";
import "./globals.css";
import "./night.css";
import "./bw.css";
import "./land.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteOrigin(),
  title: {
    default: "Wonderland: don't ask AI for the answer, ask it for a world",
    template: "%s — Wonderland",
  },
  description:
    "Type any why question. Wonderland builds a living world where the answer is secretly at work, checks it against real science, and lets you discover it yourself while an AI scientist races you to it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${bricolage.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
