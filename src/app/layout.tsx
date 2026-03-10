import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { CookieConsentProvider } from "@/components/providers/CookieConsentProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${siteConfig.name} | Find Your Dream Home`,
  description: siteConfig.og.description,
  keywords: `real estate, homes for sale, houses for rent, ${siteConfig.name}`,
  openGraph: {
    siteName: siteConfig.og.siteName,
    type: "website",
    locale: "en_US",
    images: [{ url: siteConfig.og.image }],
  },
};

// Build CSS custom property style object from siteConfig colors
const brandStyles: Record<string, string> = {
  "--primary-50": siteConfig.colors.primary50,
  "--primary-100": siteConfig.colors.primary100,
  "--primary-200": siteConfig.colors.primary200,
  "--primary-300": siteConfig.colors.primary300,
  "--primary-400": siteConfig.colors.primary400,
  "--primary-500": siteConfig.colors.primary500,
  "--primary-600": siteConfig.colors.primary600,
  "--primary-700": siteConfig.colors.primary700,
  "--primary-800": siteConfig.colors.primary800,
  "--primary-900": siteConfig.colors.primary900,
  "--accent-500": siteConfig.colors.accent500,
  "--accent-600": siteConfig.colors.accent600,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={brandStyles as React.CSSProperties}>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <CookieConsentProvider>
          <CookieConsentBanner />
          <SessionProvider>
            <PostHogProvider>{children}</PostHogProvider>
          </SessionProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
