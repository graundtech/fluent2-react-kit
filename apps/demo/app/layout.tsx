import type { Metadata } from "next";

import { buildThemeInitScript } from "../lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fluent 2 React Kit Demo",
  description: "Next.js demo for @graundtech/fluent2-react-kit components."
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
