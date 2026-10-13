import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeldo — Episode I: The Sunken Sanctum",
  description:
    "An overhead 3D action-adventure game built with Next.js 16, React 19, Babylon.js, Zustand, and Web Audio API.",
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
