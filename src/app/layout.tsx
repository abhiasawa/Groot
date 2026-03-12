import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Noto API",
  description: "Backend services for the Noto mobile app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
