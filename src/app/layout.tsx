import type { Metadata } from "next";
// Self-hosted fonts, not next/font/google — that approach makes every build
// perform a live fetch to fonts.googleapis.com for the font CSS, which is
// fragile in any network-restricted build environment (a sandboxed CI
// runner, an air-gapped build, a corporate proxy that blocks it), not just
// this one. @fontsource ships the actual font files as npm package
// contents, resolved during `npm install` like any other dependency — a
// production build has zero external network dependency for fonts at all.
// Inter specifically uses the *-variable package: the original next/font
// call had no explicit `weight`, which for a variable-capable Google Font
// means Next silently used the full-weight-range variable file rather than
// a single static weight — @fontsource-variable/inter is the equivalent.
// The other three specified explicit weights, so their plain (non-variable)
// per-weight files match that original intent exactly, importing only the
// weights actually used rather than the full range.
import "@fontsource-variable/inter/standard.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/500-italic.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ChatWidget } from "@/components/ui/ChatWidget";

// next/font/google auto-generated these CSS custom properties from its own
// font objects; self-hosting means declaring them explicitly instead, each
// mapped to the exact font-family name its @fontsource package's own
// @font-face rules declare (confirmed by reading those files directly, not
// assumed — @fontsource's variable packages in particular use a distinctly
// suffixed name, "Inter Variable", not the plain "Inter" the static package
// would use). Fallback stacks match what next/font/google appends by default
// for each font's category.
const fontVariableStyle = {
  "--font-display": "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  "--font-body": "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
  "--font-mono": "'JetBrains Mono', ui-monospace, monospace",
  "--font-accent": "'Fraunces', ui-serif, Georgia, serif",
} as React.CSSProperties;

export const metadata: Metadata = {
  title: "Webma — Create a website with AI",
  description: "Describe your website. Webma designs, generates, edits and helps you publish it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={fontVariableStyle}>
      <body className="bg-[#070a12] text-white font-body antialiased">
        <ToastProvider>{children}<ChatWidget /></ToastProvider>
      </body>
    </html>
  );
}
