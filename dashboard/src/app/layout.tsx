import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import DashboardShell from "./DashboardShell";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SysWatch — System Telemetry",
  description:
    "Real-time system monitoring dashboard showing CPU, RAM, GPU, Storage, Network, and system telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark h-full antialiased", geistMono.variable, inter.variable)}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-sans)]">
        <DashboardShell>
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
