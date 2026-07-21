/**
 * Root document shared by every Cube Lab 3D route.
 *
 * This file owns global metadata, the Geist font variables, favicon links, and
 * the one global stylesheet. Route components provide the actual page content.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cube Lab 3D — Play Online Puzzle Cubes",
  description: "Play a touch-friendly 3D puzzle cube now and explore the growing Cube Lab puzzle catalog.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

/**
 * Builds the shared HTML document around the active route.
 *
 * @param props.children - Page content selected by the router.
 * @returns The accessible English-language document shell.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
