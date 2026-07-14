import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nurturee — Trusted Care for Your Loved Ones | Child Care, Elder Care, Doctor Consultation",
  description:
    "Nurturee provides verified child care, elder care, doctor consultation and caregiver verification services in Gurgaon. Book pregnancy planning, prenatal, postnatal, nanny, elder caregiver and pediatric specialist visits online or at-home.",
  keywords: [
    "child care Gurgaon",
    "elder care Gurgaon",
    "nanny service Gurgaon",
    "Jappa nanny",
    "24 hour live nanny",
    "day nanny",
    "pregnancy planning",
    "prenatal care",
    "postnatal care",
    "doctor consultation",
    "caregiver verification",
    "background check",
    "India home health care",
  ],
  authors: [{ name: "Nurturee" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nurturee",
  },
  openGraph: {
    title: "Nurturee — Trusted Care for Your Loved Ones",
    description:
      "Verified child care, elder care, doctor consultation & caregiver verification services in Gurgaon. Book online or at-home.",
    siteName: "Nurturee",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nurturee — Trusted Care for Your Loved Ones",
    description:
      "Verified child care, elder care, doctor consultation & caregiver verification services in Gurgaon.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
