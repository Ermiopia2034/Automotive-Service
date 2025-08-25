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
  title: "AutoService - Car Service Management System",
  description: "Professional automotive service center management platform for customers, mechanics, garages, and administrators",
  keywords: ["automotive", "car service", "garage", "mechanic", "vehicle maintenance"],
  authors: [{ name: "AutoService Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#3B82F6",
  robots: "index, follow",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "AutoService - Car Service Management",
    description: "Professional automotive service center management platform",
    type: "website",
    siteName: "AutoService"
  }
};

import ErrorBoundary from '@/components/ErrorBoundary';

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
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
