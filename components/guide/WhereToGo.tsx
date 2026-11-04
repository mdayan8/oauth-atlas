"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { Skeleton } from "../ui";
import { plural } from "./shared";

const LINK_ICON: Record<string, string> = { register: "+", console: "⌘", review: "✓", docs: "≡", support: "?", status: "•" };

export default function WhereToGo({ g, live }: { g: Guide; live: boolean }) {
  const [all, setAll] = useState(false);
  if (!g.links.length && !live && !g.portal) return null;
  const every = g.links.length ? g.links : g.portal ? [{ kind: "console" as const, label: `Open the ${g.name} developer portal`, url: g.portal }] : [];
  const links = all ? every : every.slice(0, 5);
  return (
    <section className="rounded-2xl bg-card p-1.5" aria-label="Where to go">
      <h2 className="label px-3.5 pb-3 pt-3 text-ink">Where to go</h2>
      <div className="rounded-xl bg-row p-1.5">
        {links.length === 0 && <Skeleton bare tall />}
        <ul className="rows flex flex-col">
          {links.map((l) => {
            const main = l.kind === "register";
            return (
              <li key={l.url + l.label}>
                <a href={l.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-card">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px]"
                    style={main ? { background: "var(--accent)", color: "var(--on-accent)" } : { background: "var(--card)", color: "var(--ink-2)" }}
                  >
                    {LINK_ICON[l.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] ${main ? "font-medium text-accent" : ""}`}>{l.label}</span>
                    {"note" in l && l.note && <span className="block break-words text-[12px] text-ink-3">{l.note}</span>}
                  </span>
                  <span className="text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent">↗</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      {every.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="label px-3.5 py-3 !text-[11px] text-ink-3 hover:text-ink">
          {all ? "Show fewer −" : `${plural(every.length - 5, "more link")} +`}
        </button>
      )}
    </section>
  );
}
