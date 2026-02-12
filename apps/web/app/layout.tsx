import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "7Roars Agency OS",
  description: "Internal agency management platform for 7Roars Digital Agency",
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
