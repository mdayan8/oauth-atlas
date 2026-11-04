"use client";

import { useEffect, useState } from "react";
import type { Guide } from "@/lib/schema";
import { EvidenceBadge, Row } from "../ui";

export default function Sources({ g, style }: { g: Guide; style: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [lit, setLit] = useState(0);
  // Citation links like [3] open this list, scroll to that source and highlight it.
  useEffect(() => {
    const show = (n: number) => {
      setOpen(true);
      setLit(n);
      setTimeout(() => document.getElementById(`src-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
      setTimeout(() => setLit(0), 2200);
    };
    const onCite = (e: Event) => show((e as CustomEvent<number>).detail);
    const fromHash = Number(location.hash.match(/^#src-(\d+)$/)?.[1]);
    if (fromHash) show(fromHash);
    window.addEventListener("atlas:source", onCite);
    return () => window.removeEventListener("atlas:source", onCite);
  }, []);
  if (!g.sources.length) return null;
  const counts = g.sources.reduce<Record<string, number>>((a, x) => ((a[x.badge] = (a[x.badge] ?? 0) + 1), a), {});
  return (
    <section id="sources" className="rounded-2xl bg-card p-1.5" style={style}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 px-3.5 py-3 text-left">
        <h2 className="label text-ink">Sources</h2>
        <span className="flex flex-wrap gap-1.5">
          {(Object.keys(counts) as (keyof typeof counts)[]).map((b) => (
            <span key={b} className="flex items-center gap-1">
              <EvidenceBadge badge={b as never} />
              <span className="label !text-[11px] text-ink-3">{counts[b]}</span>
            </span>
          ))}
        </span>
        <span className="label ml-auto !text-[11px] text-ink-3">{open ? "Hide −" : `Show all ${g.sources.length} +`}</span>
      </button>
      {open && (
        <div className="rows flex flex-col gap-1">
          <p className="px-3.5 pb-2 text-[13px] leading-relaxed text-ink-3">
            Tested by agent: we fetched it live. Official docs: the provider says so. Third-party: only blogs or vendors say so. Unverified:
            no source yet, so check it yourself.
          </p>
          {g.sources.map((x, i) => (
            <Row key={x.id} className={`transition-shadow duration-500 ${lit === i + 1 ? "shadow-[0_0_0_2px_var(--accent)]" : ""}`}>
              <div id={`src-${i + 1}`} className="flex scroll-mt-24 flex-wrap items-start gap-3">
                <span className="label w-6 pt-0.5 text-ink-3">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a href={x.url} target="_blank" rel="noreferrer" className="text-[15px] hover:text-accent">
                    {x.title}
                  </a>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-ink-3">{x.url}</p>
                  {x.note && <p className="mt-1 text-[13px] text-ink-2">{x.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <EvidenceBadge badge={x.badge} />
                  <span className="label !text-[10px] text-ink-3">Checked {x.checked}</span>
                </div>
              </div>
            </Row>
          ))}
          {g.unverified.length > 0 && (
            <Row>
              <p className="label !text-[11px] text-ink-3">What we could not verify</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-ink-2">
                {g.unverified.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-ink-3">?</span>
                    {x}
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </div>
      )}
    </section>
  );
}
