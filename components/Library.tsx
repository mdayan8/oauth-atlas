"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Difficulty } from "@/lib/schema";
import { DIFFICULTY_LABEL } from "@/lib/share";
import { difficultyIndex } from "@/lib/situation";
import AppSearch from "./AppSearch";
import { DIFF_COLOR, DifficultyPill } from "./ui";
import AppLogo from "./AppLogo";
import { findToolkits, MANAGED_COUNT, TOOLKITS } from "@/lib/toolkits";

export type Card = {
  slug: string;
  name: string;
  domain: string;
  summary: string;
  min: Difficulty;
  max: Difficulty;
  routes: { label: string; difficulty: Difficulty; handsOn: string; waiting: string }[];
};

export default function Library({ cards, hero }: { cards: Card[]; hero: React.ReactNode }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = cards.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.domain.includes(needle));
  const hits = findToolkits(q);
  const [dir, setDir] = useState<"managed" | "own">("managed");
  const listed = TOOLKITS.filter((t) => (dir === "managed") === t.managed);

  function go(v: string) {
    const hit = cards.find((c) => c.name.toLowerCase() === v.toLowerCase() || c.slug === v.toLowerCase() || c.domain === v.toLowerCase());
    router.push(hit ? `/guide/${hit.slug}` : `/live?q=${encodeURIComponent(v)}`);
  }

  return (
    <>
      {/* One headline, one line, one action: the search, inside a framed product window, with a live preview beside it. */}
      <div className="relative">
        <div aria-hidden className="glow pointer-events-none absolute left-1/2 top-[-180px] h-[720px] w-[1200px] max-w-[100vw] -translate-x-1/2" />
        <div className="relative mx-auto max-w-4xl text-center">{hero}</div>

        <div className="relative mx-auto mt-8 max-w-5xl rounded-[28px] bg-card/80 p-1.5 shadow-[0_40px_120px_-40px_rgba(0,7,205,0.35)] ring-1 ring-[var(--line)] backdrop-blur">
          <div className="grid grid-cols-1 gap-6 rounded-[22px] bg-row p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
            <div className="min-w-0">
              <AppSearch onSubmit={go} onChange={setQ} />
              {hits.length > 0 && (
                <ul className="mt-2 flex flex-col overflow-hidden rounded-xl border border-line bg-bg" aria-label="Matching apps">
                  {hits.map((t) => (
                    <li key={t.slug}>
                      <button
                        type="button"
                        onClick={() => go(cards.some((c) => c.slug === t.slug) ? t.slug : t.name)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] hover:bg-row"
                      >
                        <AppLogo src={`https://logos.composio.dev/api/${t.slug}`} name={t.name} size={18} />
                        <span className="flex-1">{t.name}</span>
                        <span className={`label ${t.managed ? "text-accent" : "text-ink-3"}`}>{t.managed ? "Composio-managed" : "Bring your own app"}</span>
                        <span className="label text-ink-3">{cards.some((c) => c.slug === t.slug) ? "Guide" : "Generate"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {cards.map((c) => (
                  <Link key={c.slug} href={`/guide/${c.slug}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-card pl-2.5 pr-4 text-[14px] hover:text-accent">
                    <AppLogo src={`https://logos.composio.dev/api/${c.slug}`} name={c.name} size={18} />
                    {c.name}
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-[14px] text-ink-3">
                Any other app: the agent builds its guide live, with sources. {TOOLKITS.length} OAuth apps indexed from Composio&rsquo;s directory, {MANAGED_COUNT} of them Composio-managed.
              </p>
            </div>
            <Spectrum cards={cards} />
          </div>
        </div>
      </div>

      <section id="library" className="mt-24 scroll-mt-24">
        <h2 className="text-center text-[28px] leading-tight tracking-[-0.6px]">Six apps, six kinds of hard</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <Link key={c.slug} href={`/guide/${c.slug}`} className="group flex flex-col gap-2 rounded-xl border border-line bg-bg p-4 transition-colors hover:border-accent">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2.5 text-[16px] font-medium group-hover:text-accent">
                  <AppLogo src={`https://logos.composio.dev/api/${c.slug}`} name={c.name} size={22} />
                  {c.name}
                </p>
                <span className="flex items-center gap-1">
                  <DifficultyPill d={c.min} />
                  {difficultyIndex(c.max) > difficultyIndex(c.min) && (
                    <>
                      <span className="text-ink-3">→</span>
                      <DifficultyPill d={c.max} />
                    </>
                  )}
                </span>
              </div>
              <p className="line-clamp-2 text-[14px] leading-relaxed text-ink-2">{c.summary}</p>
            </Link>
          ))}
          {shown.length === 0 && (
            <button onClick={() => go(q)} className="rounded-xl border border-line p-4 text-left sm:col-span-2 lg:col-span-3">
              <p className="text-[16px]">No guide for &ldquo;{q}&rdquo; yet.</p>
              <p className="mt-1 text-[14px] text-ink-2">Generate one live.</p>
            </button>
          )}
        </div>
      </section>

      {/* Composio's managed OAuth app directory: the first question for any app is whether you can skip registration. */}
      <section id="directory" className="mt-24 scroll-mt-24">
        <h2 className="text-center text-[28px] leading-tight tracking-[-0.6px]">Every OAuth app Composio knows</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[14px] text-ink-2">
          From Composio&rsquo;s managed OAuth app directory. Composio-managed means no app of your own; bring your own means you register one and the guide shows how hard that is.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {(["managed", "own"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDir(k)}
              aria-pressed={dir === k}
              className={`label h-10 rounded-full px-4 transition-colors ${dir === k ? "bg-ink text-bg" : "bg-row text-ink-2 hover:text-ink"}`}
            >
              {k === "managed" ? `Composio-managed · ${MANAGED_COUNT}` : `Bring your own app · ${TOOLKITS.length - MANAGED_COUNT}`}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {listed.map((t) => {
            const inLibrary = cards.some((c) => c.slug === t.slug);
            return (
              <Link
                key={t.slug}
                href={inLibrary ? `/guide/${t.slug}` : `/live?q=${encodeURIComponent(t.name)}`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors hover:text-accent ${inLibrary ? "bg-accent-soft text-accent" : "bg-row"}`}
              >
                <AppLogo src={`https://logos.composio.dev/api/${t.slug}`} name={t.name} size={14} />
                {t.name}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

// The core idea, playing by itself: same app, different route, different answer. Hover to pause.
function Spectrum({ cards }: { cards: Card[] }) {
  const apps = cards.filter((c) => c.routes.length > 1);
  const start = Math.max(0, apps.findIndex((c) => c.slug === "gmail"));
  const [pos, setPos] = useState({ app: start, route: 0 });
  const [paused, setPaused] = useState(false);
  const STEP = 3200;
  useEffect(() => {
    if (paused || !apps.length) return;
    const t = setTimeout(() => {
      setPos(({ app, route }) => (route + 1 < apps[app].routes.length ? { app, route: route + 1 } : { app: (app + 1) % apps.length, route: 0 }));
    }, STEP);
    return () => clearTimeout(t);
  }, [paused, pos, apps]);
  const c = apps[pos.app];
  if (!c) return null;
  const r = c.routes[pos.route];
  const d = difficultyIndex(r.difficulty);

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-line bg-bg p-5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {!paused && <span key={`${pos.app}-${pos.route}`} className="tick absolute left-0 top-0 h-0.5 bg-accent" style={{ animationDuration: `${STEP}ms` }} />}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[16px] font-medium">
          <AppLogo src={`https://logos.composio.dev/api/${c.slug}`} name={c.name} size={20} />
          {c.name}
        </span>
        <span className="flex gap-1.5" aria-label={`Path ${pos.route + 1} of ${c.routes.length}`}>
          {c.routes.map((x, k) => (
            <button
              key={x.label}
              type="button"
              onClick={() => setPos({ app: pos.app, route: k })}
              aria-label={x.label}
              className={`h-1.5 rounded-full transition-all ${k === pos.route ? "w-5 bg-accent" : "w-1.5 bg-line"}`}
            />
          ))}
        </span>
      </div>
      <p key={r.label} className="rise mt-4 min-h-[2.75em] text-[14px] leading-snug text-ink-2">{r.label}</p>
      <p key={r.label + "d"} className="rise mt-3 text-[32px] leading-none tracking-[-0.8px]" style={{ color: DIFF_COLOR[r.difficulty] }}>
        {DIFFICULTY_LABEL[r.difficulty]}
      </p>
      <div className="mt-3 flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((k) => (
          <span key={k} className="h-1.5 flex-1 rounded-full transition-colors duration-500" style={{ background: k <= d ? DIFF_COLOR[r.difficulty] : "var(--line)", transitionDelay: `${k * 60}ms` }} />
        ))}
      </div>
      <div key={r.label + "t"} className="rise mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <p className="text-[14px] leading-snug">
          <span className="label block text-ink-3">Your time</span>
          {r.handsOn}
        </p>
        <p className="text-[14px] leading-snug">
          <span className="label block text-ink-3">Waiting</span>
          {r.waiting}
        </p>
      </div>
      <Link href={`/guide/${c.slug}`} className="label mt-4 inline-block text-accent hover:opacity-80">
        Open guide →
      </Link>
    </div>
  );
}
