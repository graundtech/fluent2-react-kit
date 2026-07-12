import type { Metadata } from "next";

import { buildThemeInitScript } from "../lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fluent2-react-kit.graund.io"),
  title: {
    default: "Fluent 2 React Kit — React components and shadcn registry",
    template: "%s | Fluent 2 React Kit",
  },
  description:
    "Accessible, themeable React components inspired by Fluent 2, available through a shadcn registry or as an npm package.",
  applicationName: "Fluent 2 React Kit",
  authors: [{ name: "Graund Tech", url: "https://github.com/graundtech" }],
  creator: "Graund Tech",
  publisher: "Graund Tech",
  keywords: [
    "Fluent 2",
    "React components",
    "shadcn registry",
    "Tailwind CSS",
    "design system",
    "accessible UI",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Fluent 2 React Kit",
    title: "Fluent 2 React Kit — Fluent-inspired components, source-owned",
    description:
      "Accessible, themeable React components with shadcn-style APIs. Copy the source from the registry or install the npm package.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fluent 2 React Kit — React components and shadcn registry",
    description:
      "Accessible, themeable Fluent 2-inspired components with source-owned distribution.",
  },
  category: "technology",
};

/**
 * Pre-hydration theme script. Applies the persisted theme (dark /
 * high-contrast) to <html> before React hydrates, so there is no flash of the
 * wrong theme on load. Both this script and the interactive toggle derive from
 * the constants in `lib/theme.ts` — the single source of truth — so they can't
 * drift. Inlined (not an external script) so it runs synchronously, before paint.
 */
const THEME_INIT_SCRIPT = buildThemeInitScript();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-sans antialiased" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
