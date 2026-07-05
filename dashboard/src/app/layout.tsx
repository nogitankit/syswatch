import type { Metadata } from "next";
import { Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SysWatch — System Telemetry",
  description:
    "Real-time system monitoring dashboard showing CPU, RAM, and process telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark h-full antialiased", geistMono.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-geist-mono)]">
        {children}
      </body>
    </html>
  );
}
