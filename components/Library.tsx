"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Difficulty } from "@/lib/schema";
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
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div>
          {hero}
          <div className="mt-10 max-w-2xl">
            <AppSearch onSubmit={go} onChange={setQ} />
        <p className="mt-4 flex flex-wrap items-center gap-2 text-[14px] text-ink-3">
          Not in the library? The agent investigates it live. Try
          {TRY.map((t) => (
            <button key={t} onClick={() => go(t)} className="label rounded-full bg-card px-3 py-1.5 !text-[11px] text-ink-2 hover:text-accent">
              {t}
            </button>
          ))}
            </p>
          </div>
        </div>
        <Spectrum cards={cards} />
      </div>

      <section id="library" className="mt-20 scroll-mt-24">
        <div className="flex items-baseline gap-3">
          <h2 className="label text-ink">Library</h2>
          <span className="label text-ink-3">{shown.length} hand-checked guides</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

// The core insight in one picture: the same app can be easy or gated depending on who you are and what you ask for.
function Spectrum({ cards }: { cards: Card[] }) {
  const cols = ["Instant", "Easy", "Moderate", "Hard", "Gated"];
  return (
    <div className="rounded-2xl bg-card p-1.5">
      <div className="rounded-xl bg-row p-5">
        <p className="label text-ink">Same app, different answer</p>
        <p className="mt-1 text-[13px] text-ink-3">Each bar runs from the easiest situation to the hardest.</p>
        <div className="mt-5 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
          <span />
          <div className="grid grid-cols-5">
            {cols.map((c) => (
              <span key={c} className="label truncate text-center !text-[9px] text-ink-3">
                {c}
              </span>
            ))}
          </div>
          {cards.map((c, i) => {
            const a = difficultyIndex(c.min);
            const b = difficultyIndex(c.max);
            return (
              <Link key={c.slug} href={`/guide/${c.slug}`} className="group contents">
                <span className="truncate text-[13px] leading-6 group-hover:text-accent">{c.name}</span>
                <span className="relative h-6 rounded-full bg-[repeating-linear-gradient(90deg,var(--card)_0_20%,transparent_20%_40%)]">
                  <span
                    className="grow-bar absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full group-hover:h-3.5"
                    style={{
                      left: `${a * 20 + 4}%`,
                      width: `${(b - a) * 20 + 12}%`,
                      background: `linear-gradient(90deg, ${DIFF_COLOR[c.min]}, ${DIFF_COLOR[c.max]})`,
                      animationDelay: `${200 + i * 90}ms`,
                    }}
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
