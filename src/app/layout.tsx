import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/i18n/client";
import { UpdateBanner } from "@/components/UpdateBanner";
import { getLocale } from "@/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Sets <html data-theme="light|dark"> before the first paint (see "Preventing flash before hydration" in the
// Next.js docs). The Studio look in globals.css only applies inside the dashboard, so other pages ignore it.
// Preference lives in localStorage under "ls-theme": "light" | "dark" | "system" (default).
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("ls-theme");var d=p==="dark"||((p===null||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

export const metadata: Metadata = {
  title: "LeadSync — Facebook leads to your CRM",
  description:
    "LeadSync — Facebook Lead Ads formalaridan kelgan lidlarni Bitrix24, amoCRM va Kommo tizimlariga avtomatik yetkazadi.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/leadsync-icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale}>
          <UpdateBanner />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
