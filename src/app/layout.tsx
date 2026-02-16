import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Groot - AI Second Brain",
  description: "Your empathetic AI second brain on WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
