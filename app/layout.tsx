import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

export const metadata: Metadata = {
  title: "Private Muay Thai Training | Soul Lab Gym Townsville",
  description: "Book a private 1-on-1 Muay Thai session with WMO State Champion Joseph Gabiola. Personalised coaching in Townsville. Limited spots available.",
  openGraph: {
    title: "Private Muay Thai Training | Soul Lab Gym",
    description: "1-on-1 coaching with a WMO State Champion. Book your session today.",
    url: "https://pt.soullabgym.com",
    siteName: "Soul Lab Gym",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
