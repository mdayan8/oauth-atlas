"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Difficulty } from "@/lib/schema";
import { DIFFICULTY_LABEL } from "@/lib/share";
import { difficultyIndex } from "@/lib/situation";
import AppSearch from "./AppSearch";
import { DIFF_COLOR, DifficultyPill, Pill } from "./ui";

export type Card = {
  slug: string;
  name: string;
  domain: string;
  summary: string;
  min: Difficulty;
  max: Difficulty;
  handsOn: string;
  waiting: string;
  managed: string;
  sources: number;
  routes: { label: string; difficulty: Difficulty; handsOn: string; waiting: string }[];
};

const TRY = ["Linear", "Salesforce", "Zoom", "HubSpot"];

export default function Library({ cards, hero }: { cards: Card[]; hero: React.ReactNode }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = cards.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.domain.includes(needle));

  function go(v: string) {
    const hit = cards.find((c) => c.name.toLowerCase() === v.toLowerCase() || c.slug === v.toLowerCase() || c.domain === v.toLowerCase());
    router.push(hit ? `/guide/${hit.slug}` : `/live?q=${encodeURIComponent(v)}`);
  }

  return (
    <>
      {/* Hero: centred headline over a soft glow, then a product window with the real search and a live preview. */}
      <div className="relative">
        <div aria-hidden className="glow pointer-events-none absolute left-1/2 top-[-180px] h-[720px] w-[1200px] max-w-[100vw] -translate-x-1/2" />
        <div className="relative mx-auto max-w-3xl text-center">{hero}</div>

        <div className="relative mx-auto mt-12 max-w-5xl rounded-[28px] bg-card/80 p-1.5 shadow-[0_40px_120px_-40px_rgba(0,7,205,0.35)] ring-1 ring-[var(--line)] backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_15%,transparent)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_15%,transparent)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_15%,transparent)]" />
            <span className="label ml-3 !text-[10px] text-ink-3">oauth atlas · look up any app</span>
          </div>
          <div className="grid grid-cols-1 gap-6 rounded-[22px] bg-row p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
            <div className="min-w-0">
              <p className="label text-accent">Start here</p>
              <p className="mt-3 text-[28px] leading-tight tracking-[-0.6px] sm:text-[32px]">Which app do your users need to connect?</p>
              <div className="mt-6">
                <AppSearch onSubmit={go} onChange={setQ} />
              </div>
              <p className="label mt-6 !text-[10px] text-ink-3">Hand-checked guides</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cards.map((c) => (
                  <Link key={c.slug} href={`/guide/${c.slug}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-card px-3.5 text-[13px] hover:text-accent">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: DIFF_COLOR[c.max] }} />
                    {c.name}
                  </Link>
                ))}
              </div>
              <p className="label mt-5 !text-[10px] text-ink-3">Or watch the agent build one live</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TRY.map((t) => (
                  <button key={t} onClick={() => go(t)} className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] text-accent ring-1 ring-[var(--accent-soft)] hover:bg-accent-soft">
                    <span className="text-[11px]">✦</span>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Spectrum cards={cards} />
          </div>
        </div>
      </div>

      <section id="library" className="mt-28 scroll-mt-24">
        <div className="text-center">
          <p className="label text-accent">Library</p>
          <h2 className="mt-3 text-[36px] leading-tight tracking-[-0.9px]">Six apps, six different shapes</h2>
          <p className="mx-auto mt-3 max-w-xl text-[16px] text-ink-2">Picked to cover the range: instant, scope-dependent, cost-gated, review-gated. Each one checked against official docs.</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <Link key={c.slug} href={`/guide/${c.slug}`} className="group flex flex-col rounded-2xl bg-card p-1.5 transition-transform hover:-translate-y-0.5">
              <div className="flex flex-1 flex-col rounded-xl bg-row p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[20px] leading-tight tracking-[-0.4px] group-hover:text-accent">{c.name}</p>
                    <p className="mt-1 font-mono text-[12px] text-ink-3">{c.domain}</p>
                  </div>
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
                <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-2">{c.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
                <span className="label !text-[11px] text-ink-3">
                  <span className="text-ink">{c.handsOn}</span> hands-on
                </span>
                <span className="label !text-[11px] text-ink-3">
                  <span className="text-ink">{c.waiting}</span> wait
                </span>
                {c.managed === "yes" && (
                  <span className="ml-auto">
                    <Pill color="var(--d-instant)">Composio-managed</Pill>
                  </span>
                )}
              </div>
            </Link>
          ))}
          {shown.length === 0 && (
            <button onClick={() => go(q)} className="rounded-2xl bg-card p-6 text-left sm:col-span-2 lg:col-span-3">
              <p className="text-[18px]">No guide for &ldquo;{q}&rdquo; yet.</p>
              <p className="mt-1 text-[14px] text-ink-2">Press Generate guide and the agent will build one live, with sources.</p>
            </button>
          )}
        </div>
      </section>
    </>
  );
}

// The core insight, playing by itself: one app, one route at a time, the verdict re-shaping as it goes.
// It steps through each app's real routes, then moves to the next app. Hover to pause.
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
  const go = (delta: number) => setPos(({ app, route }) => ({ app, route: (route + delta + c.routes.length) % c.routes.length }));

  return (
    <div className="ice min-w-0 rounded-3xl p-4 sm:p-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-2xl bg-row p-5 shadow-[0_24px_60px_-28px_rgba(0,7,205,0.35)] sm:p-6">
        {!paused && <span key={`${pos.app}-${pos.route}`} className="tick absolute left-0 top-0 h-0.5 bg-accent" style={{ animationDuration: `${STEP}ms` }} />}

        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-[15px] font-medium text-bg">{c.name[0]}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-medium leading-tight">{c.name}</span>
            <span className="block font-mono text-[12px] text-ink-3">{c.domain}</span>
          </span>
          <span className="label flex items-center gap-1.5 !text-[10px] text-accent">
            <span className={`h-1.5 w-1.5 rounded-full bg-accent ${paused ? "" : "pulse-dot"}`} />
            Live preview
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label !text-[10px] text-ink-3">If your path is</p>
            <p key={r.label} className="rise mt-1 min-h-[2.75em] text-[17px] leading-snug">{r.label}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => go(-1)} aria-label="Previous path" className="grid h-8 w-8 place-items-center rounded-full bg-card text-ink-2 hover:text-ink">
              ‹
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next path" className="grid h-8 w-8 place-items-center rounded-full bg-card text-ink-2 hover:text-ink">
              ›
            </button>
          </div>
        </div>

        <p key={r.label + "d"} className="rise mt-5 text-[44px] leading-none tracking-[-1.1px]" style={{ color: DIFF_COLOR[r.difficulty] }}>
          {DIFFICULTY_LABEL[r.difficulty]}
        </p>
        <div className="mt-4 flex gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((k) => (
            <span
              key={k}
              className="h-1.5 flex-1 rounded-full transition-colors duration-500"
              style={{ background: k <= d ? DIFF_COLOR[r.difficulty] : "color-mix(in srgb, var(--ink) 10%, transparent)", transitionDelay: `${k * 60}ms` }}
            />
          ))}
        </div>

        <div key={r.label + "t"} className="rise mt-5 grid grid-cols-2 gap-2">
          <div className="min-h-[104px] rounded-xl bg-card px-3.5 py-3">
            <p className="label !text-[10px] text-ink-3">Your time</p>
            <p className="mt-1 text-[15px] leading-snug">{r.handsOn}</p>
          </div>
          <div className="min-h-[104px] rounded-xl bg-card px-3.5 py-3">
            <p className="label !text-[10px] text-ink-3">Waiting on {c.name}</p>
            <p className="mt-1 text-[15px] leading-snug">{r.waiting}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="flex gap-1.5" aria-label={`Path ${pos.route + 1} of ${c.routes.length}`}>
            {c.routes.map((x, k) => (
              <button
                key={x.label}
                type="button"
                onClick={() => setPos({ app: pos.app, route: k })}
                aria-label={x.label}
                className={`h-1.5 rounded-full transition-all ${k === pos.route ? "w-5 bg-accent" : "w-1.5 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"}`}
              />
            ))}
          </span>
          <Link href={`/guide/${c.slug}`} className="label !text-[11px] text-accent hover:opacity-80">
            Open guide →
          </Link>
        </div>
      </div>

      <div className="mt-4 hidden flex-wrap items-center justify-center gap-y-2 sm:flex">
        {apps.map((x, k) => (
          <button
            key={x.slug}
            type="button"
            onClick={() => setPos({ app: k, route: 0 })}
            className={`label rounded-full px-2 py-1 !text-[10px] !tracking-[0.03em] transition-colors ${k === pos.app ? "bg-row text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            {x.name}
          </button>
        ))}
      </div>
    </div>
  );
}
