import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elevacx | Application Portal",
  description: "Apply to join the Elevacx team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-elevacx-gradient">{children}</body>
    </html>
  );
}
