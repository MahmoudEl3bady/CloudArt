import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
  preload: true,
  weight: "100 900",
  fallback: ["system-ui", "arial"],
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Cloud Art - AI Image Editing",
    template: "%s | Cloud Art",
  },
  description: "Edit your images with simple prompts using AI Model",
  keywords: ["AI", "image editing", "cloudinary", "transformation"],
  authors: [{ name: "Mahmoud Elabady" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://image-editor-wine-omega.vercel.app/",
    title: "Cloud Art - AI Image Editing",
    description: "Edit your images with simple prompts using AI Model",
    siteName: "Cloud Art",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud Art - AI Image Editing",
    description: "Edit your images with simple prompts using AI Model",
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning={true}
      >
        <ClerkProvider>{children}</ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
