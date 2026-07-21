/* ==========================================================================
   ROOT LAYOUT
   Sets document metadata, loads global styles, and wraps the app in the
   ToastProvider so any client component can raise feedback messages.
   ========================================================================== */
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cube Lab 3D — Solve Your Cube in Seconds",
  description:
    "Solve your Rubik's Cube in seconds. Enter your cube and get a free, step-by-step solution. No account required.",
};

export const viewport: Viewport = {
  themeColor: "#05070d",
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
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
