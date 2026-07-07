import "./globals.css";
import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import XAdsPixel from "@/components/XAdsPixel";

export const metadata: Metadata = {
  title: {
    template: "%s | DeSciNYC",
    default: "DeSciNYC | Decentralized Science NYC",
  },
  description:
    "A monthly NYC meetup for science enthusiasts to learn, share projects, and socialize. Science is for everyone, and we try to makeit accesible to all.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-PF-Videotext antialiased bg-black text-white w-full min-h-screen`}
      >
        <XAdsPixel pixelId={process.env.X_ADS_PIXEL_ID} />
        <TopNav />
        {children}
      </body>
    </html>
  );
}
