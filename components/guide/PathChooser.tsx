"use client";

import { toolkitUrl } from "@/lib/composio";
import { useState } from "react";
import type { Guide, PathOptionT } from "@/lib/schema";
import { applyPreset, pickVerdict, type Audience, type Profile, type Resolved, type Situation } from "@/lib/situation";
import { DIFFICULTY_LABEL } from "@/lib/share";
import { DIFF_COLOR } from "../ui";
import { plural } from "./shared";

const PROFILES: [Profile, string][] = [
  ["individual", "Individual"],
  ["startup", "Startup"],
  ["company", "Company"],
];
const AUDIENCES: [Audience, string][] = [
  ["few", "Just me + testers"],
  ["many", "Real users"],
];

// Real routes through setup, side by side, each with its own verdict. Picking one re-shapes the whole guide.
export default function PathChooser({
  g,
  sit,
  r,
  set,
  style,
}: {
  g: Guide;
  sit: Situation;
  r: Resolved;
  set: (p: Partial<Situation>) => void;
  style: React.CSSProperties;
}) {
  const [tune, setTune] = useState(false);
  const apply = (p: PathOptionT) => applyPreset(sit, p.set);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const isOn = (p: PathOptionT) =>
    (!p.set.audience || p.set.audience === sit.audience) && (!p.set.profile || p.set.profile === sit.profile) && (!p.set.needs || same(p.set.needs, sit.needs));
  const skips = [
    ...(g.skip.composioManaged === "yes" ? [{ label: "Use Composio's managed app", note: "No app, no review. Users see Composio on consent.", url: toolkitUrl(g), cta: "Use Composio →" }] : []),
    ...(g.skip.mcpDcr === "yes" && g.skip.mcpServer ? [{ label: `Use ${g.name}'s MCP server`, note: "Agents register themselves. No app of your own.", url: g.skip.mcpServer, cta: "Open →" }] : []),
  ];
  const skip = skips.length > 0;

  return (
    <section id="paths" className="scroll-mt-24 rounded-xl border border-line bg-bg p-2" style={style} aria-label="Choose your path">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Choose your path</h2>
        <p className="text-[12px] text-ink-3">{r.hidden > 0 ? `${plural(r.hidden, "item")} hidden` : ""}</p>
      </div>
      {(g.paths.length > 0 || skip) && (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {skips.map((k) => (
            <a
              key={k.label}
              href={k.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl p-4 transition-colors hover:bg-accent-soft"
              style={{ background: "color-mix(in srgb, var(--accent) 7%, var(--row))" }}
            >
              <p className="label text-accent">Skip it</p>
              <p className="mt-2 text-[16px] font-medium">{k.label}</p>
              <p className="mt-1 text-[13px] text-ink-2">{k.note}</p>
              <p className="mt-3 flex items-center justify-between text-[20px] leading-none" style={{ color: DIFF_COLOR.instant }}>
                Instant <span className="label text-accent group-hover:translate-x-0.5">{k.cta}</span>
              </p>
            </a>
          ))}
          {g.paths.map((p) => {
            const v = pickVerdict(g.verdicts, apply(p));
            const on = isOn(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set(applyPreset(sit, p.set))}
                aria-pressed={on}
                className={`group rounded-xl p-4 text-left transition-all ${on ? "bg-row shadow-[0_0_0_2px_var(--accent)]" : "bg-row/60 hover:bg-row"}`}
              >
                <p className={`label ${on ? "text-accent" : "text-ink-3"}`}>{on ? "Your path" : ""}</p>
                <p className="mt-2 text-[16px] font-medium">{p.label}</p>
                <p className="mt-1 text-[13px] text-ink-2">{p.detail}</p>
                {v && (
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[20px] leading-none" style={{ color: DIFF_COLOR[v.difficulty] }}>
                      {DIFFICULTY_LABEL[v.difficulty]}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      {v.handsOn} · wait {v.waiting.toLowerCase()}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      <button type="button" onClick={() => setTune(!tune)} aria-expanded={tune} className="label px-3.5 py-3 text-ink-3 hover:text-ink">
        {tune ? "Hide" : "Adjust"} {tune ? "−" : "+"}
      </button>
      {(tune || g.paths.length === 0) && (
        <div className="rise mx-1.5 mb-1.5 flex flex-wrap gap-x-8 rounded-xl bg-row px-4 pb-4">
          <Chips label="Who you are" options={PROFILES} value={[sit.profile]} onPick={(p) => set({ profile: p })} />
          <Chips label="Who will connect" options={AUDIENCES} value={[sit.audience]} onPick={(a) => set({ audience: a })} />
          {g.needs.length > 0 && (
            <Chips
              label="Your agent needs to"
              options={g.needs.map((n) => [n.id, n.label] as [string, string])}
              value={sit.needs}
              onPick={(id) => set({ needs: sit.needs.includes(id) ? sit.needs.filter((x) => x !== id) : [...sit.needs, id] })}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Chips<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: [T, string][];
  value: string[];
  onPick: (v: T) => void;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="text-[13px] text-ink-2">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map(([id, text]) => {
          const on = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(id)}
              className={`label min-h-9 rounded-full px-3 transition-colors ${on ? "bg-ink text-bg" : "bg-row text-ink-2 hover:text-ink"}`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
