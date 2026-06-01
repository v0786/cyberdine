import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CYBERDINE - Time Is Malleable. Shape It Wisely.",
  description: "Time-based entertainment and food service platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
