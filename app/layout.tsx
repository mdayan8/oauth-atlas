import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "OAuth Atlas",
  description:
    "How hard is it to get an OAuth app approved? Difficulty, time, requirements and evidence for every app your agent connects to.",
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${geist.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before paint so a saved dark theme never flashes light. React logs a dev-only note about inline scripts; it executes on the server-rendered document, which is all it needs. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <header className="sticky top-0 z-20 bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-[16px] font-medium tracking-tight">
              <Logo />
              OAuth Atlas
            </Link>
            <nav className="ml-auto flex items-center gap-1">
              <Link href="/#library" className="label hidden px-3 py-2 text-ink-2 hover:text-ink sm:block">
                Library
              </Link>
              <Link href="/verification" className="label px-3 py-2 text-ink-2 hover:text-ink">
                Evidence
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-12 pt-24 sm:px-6">
          <p className="label text-ink-3">
            Built for the Composio APM Integrations take-home. Every claim links to its source.
          </p>
        </footer>
      </body>
    </html>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d="M2 12h20M12 2c3 3 4.5 6.5 4.5 10S15 19 12 22M12 2C9 5 7.5 8.5 7.5 12S9 19 12 22" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}
