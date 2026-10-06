import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import {
  Geist_Mono,
  Inter,
  Noto_Sans_SC,
  Orbitron,
  Outfit,
  Silkscreen,
  VT323,
} from "next/font/google";
import { rssAlternateTypes, siteConfig, siteKeywords } from "@/lib/seo";
import "yet-another-react-lightbox/styles.css";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Dela Gothic One 只用于西文标题，本地托管 latin 子集，避免拉取上百个日文分片
const delaGothic = localFont({
  src: "./fonts/dela-gothic-one-latin.woff2",
  variable: "--font-dela",
  weight: "400",
  display: "swap",
  preload: false,
});


const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  preload: false,
});

const silkscreen = Silkscreen({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});


export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteKeywords,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.author.name,
  alternates: {
    canonical: "/",
    types: rssAlternateTypes(),
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistMono.variable} ${inter.variable} ${outfit.variable} ${delaGothic.variable} ${orbitron.variable} ${silkscreen.variable} ${vt323.variable} ${notoSansSc.variable} antialiased scrollbar-hide`}
      >
        {children}
      </body>
    </html>
  );
}
