import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fluent 2 React Kit Demo",
  description: "Next.js demo for @graundtech/fluent2-react-kit components."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
