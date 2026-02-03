import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
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
  title: "Harmon's Distinctive Homes | Find Your Dream Home in Florida",
  description: "Search thousands of homes for sale and rent across Florida. Find your perfect property with our easy-to-use map search and detailed listings.",
  keywords: "Florida real estate, homes for sale, houses for rent, Naples homes, Fort Myers real estate, Harmon's Distinctive Homes",
  openGraph: {
    siteName: "Harmon's Distinctive Homes",
    type: "website",
    locale: "en_US",
    images: [{ url: "/logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <SessionProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
