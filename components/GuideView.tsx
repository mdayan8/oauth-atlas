"use client";

import { useEffect, useState } from "react";
import type { Guide, PathOptionT } from "@/lib/schema";
import { minutes } from "@/lib/duration";
import AskPanel from "./AskPanel";
import { claimBadge, defaultSituation, pickVerdict, resolve, type Audience, type Profile, type Resolved, type Situation } from "@/lib/situation";
import { ACTOR_LABEL, DIFFICULTY_LABEL, toAgentPrompt, toMarkdown } from "@/lib/share";
import { DraftButton, Recheck } from "./AgentActions";
import { DIFF_COLOR, Empty, EvidenceBadge, Meter, Pill, Row, Skeleton } from "./ui";

const PROFILES: [Profile, string][] = [
  ["individual", "Individual"],
  ["startup", "Startup"],
  ["company", "Company"],
];
const AUDIENCES: [Audience, string][] = [
  ["few", "Just me + testers"],
  ["many", "Real users"],
];
const ACTOR_COLOR = { agent: "var(--accent)", you: "var(--ink)", provider: "var(--d-moderate)" };
const SKIP_COLOR = { yes: "var(--d-instant)", no: "var(--ink-3)", unknown: "var(--d-moderate)" };
const SKIP_TEXT = { yes: "Yes", no: "No", unknown: "Not sure" };

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
// Each block fades in a beat after the one before, so the guide visibly assembles itself.
const beat = (i: number) => ({ "--d": `${i * 90}ms` }) as React.CSSProperties;

type CiteFn = (p: { ids?: string[] }) => React.ReactNode;

export default function GuideView({
  guide: g,
  live = false,
  shareLink,
}: {
  guide: Guide;
  live?: boolean;
  shareLink?: () => Promise<string>;
}) {
  const [s, setS] = useState<Situation>(() => defaultSituation(g));
  // Live guides discover their needs while streaming: keep defaults in sync until the reader touches them.
  const [touched, setTouched] = useState(false);
  const sit = touched ? s : defaultSituation(g);
  const r = resolve(g, sit);
  const set = (p: Partial<Situation>) => {
    setTouched(true);
    setS({ ...sit, ...p });
  };
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const srcNum = (id: string) => g.sources.findIndex((x) => x.id === id) + 1;
  const Cite: CiteFn = ({ ids }) => {
    const nums = (ids ?? []).map(srcNum).filter((n) => n > 0);
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
        <EvidenceBadge badge={claimBadge(ids, g.sources)} />
        {nums.map((n) => (
          <a key={n} href={`#src-${n}`} className="label !text-[11px] text-ink-3 hover:text-accent">
            [{n}]
          </a>
        ))}
      </span>
    );
  };

  return (
    <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${live ? "live" : ""} ${settled ? "settled" : ""}`}>
      <div className="build flex flex-col gap-6 pb-8 pt-10 sm:pt-14 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="label text-accent">OAuth app guide{g.generated && " · generated live"}</p>
          <h1 className="h-display mt-4">{g.name || "Investigating..."}</h1>
          {g.summary && <p className="mt-4 text-[16px] leading-relaxed text-ink-2 sm:text-[18px]">{g.summary}</p>}
          <p className="label mt-4 text-ink-3">
            {g.portal ? (
              <a href={g.portal} target="_blank" rel="noreferrer" className="hover:text-accent">
                {g.domain} developer portal ↗
              </a>
            ) : (
              g.domain
            )}
            {g.checked && <> · Last checked {g.checked}</>}
          </p>
        </div>
        {!live && (
          <div className="hidden shrink-0 lg:ml-auto lg:block">
            <ShareBar g={g} r={r} s={sit} shareLink={shareLink} />
          </div>
        )}
      </div>

      <div className="build flex flex-col gap-4">
        <QuickAnswer g={g} r={r} live={live} Cite={Cite} style={beat(0)} />
        {!live && (
          <div className="lg:hidden" style={beat(1)}>
            <ShareBar g={g} r={r} s={sit} shareLink={shareLink} />
          </div>
        )}
        <PathChooser g={g} sit={sit} r={r} set={set} style={beat(1)} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start" style={beat(2)}>
          <Path g={g} r={r} live={live} Cite={Cite} />
          <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
            <WhereToGo g={g} live={live} />
            <Stuck r={r} live={live} Cite={Cite} />
          </aside>
        </div>
        {!live && g.name && (
          <div style={beat(3)}>
            <AskPanel g={g} Cite={Cite} />
          </div>
        )}
        <BeforeLaunch r={r} live={live} Cite={Cite} style={beat(4)} />
        <Sources g={g} style={beat(5)} />
      </div>
    </div>
  );
}

// The brief's four questions, answered in plain words before any detail.
function QuickAnswer({ g, r, live, Cite, style }: { g: Guide; r: Resolved; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
  const v = r.verdict;
  const counts = { agent: 0, you: 0, provider: 0 };
  r.steps.forEach((x) => counts[x.actor]++);
  const name = g.name || "this app";
  const skip =
    g.skip.composioManaged === "yes"
      ? `Quickest path: Composio already manages ${name}, so you can skip all of this. Register your own app only if you want your own branding, permissions or quota.`
      : g.skip.mcpDcr === "yes"
        ? `Quickest path: ${name}'s MCP server signs agents up automatically, so MCP users can skip this.`
        : g.skip.composioManaged === "no"
          ? `There is no shortcut: you need your own ${name} OAuth app.`
          : "";
  const tile = "rounded-xl bg-row p-5";
  const head = "label !text-[11px] text-ink-3";

  return (
    <section className="rounded-2xl bg-card p-1.5" aria-live="polite" aria-label="Quick answer" style={style}>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className={tile}>
          <p className={head}>How hard</p>
          {v ? (
            <>
              <p className="mt-2 text-[36px] leading-none tracking-[-0.9px] transition-colors duration-500" style={{ color: DIFF_COLOR[v.difficulty] }}>
                {DIFFICULTY_LABEL[v.difficulty]}
              </p>
              <div className="mt-4">
                <Meter d={v.difficulty} />
              </div>
            </>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
        <div className={tile}>
          <p className={head}>How long</p>
          {v ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-[18px] leading-snug">
                {v.handsOn} <span className="text-[14px] text-ink-3">of your time</span>
              </p>
              <p className="text-[18px] leading-snug">
                {v.waiting} <span className="text-[14px] text-ink-3">waiting on {name}</span>
              </p>
            </div>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
        <div className={tile}>
          <p className={head}>What you need</p>
          {r.requirements.length ? (
            <ul className="mt-2 flex flex-col gap-1 text-[14px]">
              {r.requirements.slice(0, 3).map((x) => (
                <li key={x.id} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span className="min-w-0">{x.label}</span>
                </li>
              ))}
              {r.requirements.length > 3 && (
                <li>
                  <a href="#path" className="text-[13px] text-ink-3 hover:text-accent">
                    +{r.requirements.length - 3} more in your path
                  </a>
                </li>
              )}
            </ul>
          ) : live ? (
            <Skeleton bare tall />
          ) : (
            <p className="mt-2 text-[14px] text-ink-2">Just a developer account.</p>
          )}
        </div>
        <div className={tile}>
          <p className={head}>Who does what</p>
          {r.steps.length ? (
            <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
              {(["agent", "you", "provider"] as const).map((k) => (
                <li key={k} className="flex items-center justify-between gap-2">
                  <Pill color={ACTOR_COLOR[k]}>{k === "provider" ? "Waiting" : ACTOR_LABEL[k]}</Pill>
                  <span>{plural(counts[k], "step")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        {skip && <p className="text-[16px] leading-relaxed">{skip}</p>}
        {v?.why && (
          <p className="text-[14px] leading-relaxed text-ink-2">
            {v.why} <Cite ids={v.sourceIds} />
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-2">
          <span className="flex items-center gap-2">
            Composio already manages it <Pill color={SKIP_COLOR[g.skip.composioManaged]}>{SKIP_TEXT[g.skip.composioManaged]}</Pill>
          </span>
          <span className="flex items-center gap-2">
            MCP server signs agents up automatically <Pill color={SKIP_COLOR[g.skip.mcpDcr]}>{SKIP_TEXT[g.skip.mcpDcr]}</Pill>
          </span>
          {g.skip.sourceIds.length > 0 && <Cite ids={g.skip.sourceIds} />}
        </div>
        {!g.generated && !live && <Recheck slug={g.slug} />}
      </div>
    </section>
  );
}

// Real routes through setup, side by side, each with its own verdict. Picking one re-shapes the whole guide.
function PathChooser({
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
  const apply = (p: PathOptionT) => ({ ...sit, ...p.set, needs: p.set.needs ?? sit.needs });
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const isOn = (p: PathOptionT) =>
    (!p.set.audience || p.set.audience === sit.audience) && (!p.set.profile || p.set.profile === sit.profile) && (!p.set.needs || same(p.set.needs, sit.needs));
  const skip = g.skip.composioManaged === "yes" ? "Use Composio's managed app" : g.skip.mcpDcr === "yes" ? `Use ${g.name}'s MCP server` : "";

  return (
    <section className="rounded-2xl bg-card p-1.5" style={style} aria-label="Choose your path">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Choose your path</h2>
        <p className="text-[12px] text-ink-3">{r.hidden > 0 ? `Tailored: ${plural(r.hidden, "item")} that don't apply are hidden.` : "Pick the one closest to you."}</p>
      </div>
      {(g.paths.length > 0 || skip) && (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {skip && (
            <div className="rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--d-instant) 8%, var(--row))" }}>
              <p className="label !text-[11px]" style={{ color: "var(--d-instant)" }}>
                Skip it
              </p>
              <p className="mt-2 text-[16px] font-medium">{skip}</p>
              <p className="mt-1 text-[13px] text-ink-2">No app of your own, no review. Your users see Composio on the consent screen.</p>
              <p className="mt-3 text-[20px] leading-none" style={{ color: DIFF_COLOR.instant }}>
                Instant
              </p>
            </div>
          )}
          {g.paths.map((p) => {
            const v = pickVerdict(g.verdicts, apply(p));
            const on = isOn(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set(p.set)}
                aria-pressed={on}
                className={`group rounded-xl p-4 text-left transition-all ${on ? "bg-row shadow-[0_0_0_2px_var(--accent)]" : "bg-row/60 hover:bg-row"}`}
              >
                <p className={`label !text-[11px] ${on ? "text-accent" : "text-ink-3"}`}>{on ? "Your path" : "Pick this"}</p>
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
      <button type="button" onClick={() => setTune(!tune)} aria-expanded={tune} className="label px-3.5 py-3 !text-[11px] text-ink-3 hover:text-ink">
        {tune ? "Hide fine-tuning" : "Fine-tune: who you are and what your agent needs"} {tune ? "−" : "+"}
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

// One path from start to approved: get the requirements ready, then each step in order.
// Only the next step is open; the rest are one line each. Progress is kept per guide in this browser.
function Path({ g, r, live, Cite }: { g: Guide; r: Resolved; live: boolean; Cite: CiteFn }) {
  const key = g.slug && !g.generated ? `atlas-progress:${g.slug}` : "";
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {}
  }, [key]);
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    setOpen(null);
    if (key)
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
  };

  const prepId = "prep";
  const items = [...(r.requirements.length ? [prepId] : []), ...r.steps.map((x) => x.id)];
  const nextId = items.find((id) => !done.includes(id));
  const shown = open ?? nextId;
  const doneCount = items.filter((id) => done.includes(id)).length;

  return (
    <section id="path" className="scroll-mt-24 rounded-2xl bg-card p-1.5">
      <div className="flex flex-wrap items-center gap-3 px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Your path</h2>
        {items.length > 0 && (
          <>
            <span className="label text-ink-3">
              {doneCount} of {items.length} done
            </span>
            <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(doneCount / items.length) * 100}%` }} />
            </div>
          </>
        )}
      </div>
      {r.steps.length > 1 && <Journey steps={r.steps} done={done} onPick={(id) => setOpen(id)} />}
      <ol className="rows flex flex-col gap-1">
        {items.length === 0 && (live ? <Skeleton /> : <Empty>No steps.</Empty>)}
        {r.requirements.length > 0 && (
          <PathItem
            n={1}
            title="Get these ready"
            pill={
              <>
                <Pill color="var(--ink-3)">{plural(r.requirements.length, "item")}</Pill>
                {r.requirements.some((x) => x.agentCanDraft) && (
                  <Pill color="var(--accent)">{r.requirements.filter((x) => x.agentCanDraft).length} the agent can draft</Pill>
                )}
              </>
            }
            done={done.includes(prepId)}
            next={nextId === prepId}
            open={shown === prepId}
            onOpen={() => setOpen(shown === prepId ? "" : prepId)}
            onDone={() => toggle(prepId)}
          >
            <ul className="mt-2 flex flex-col gap-1">
              {r.requirements.map((x) => (
                <li key={x.id}>
                  <details className="group rounded-lg px-2 py-1.5 open:bg-card">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-[15px]">
                      <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
                      {x.label}
                      {x.agentCanDraft && <Pill color="var(--accent)">Agent can draft</Pill>}
                    </summary>
                    <p className="mt-1 pl-4 text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
                    <div className="mt-1.5 pl-4">
                      <Cite ids={x.sourceIds} />
                      {x.agentCanDraft && !live && (
                        <div>
                          <DraftButton g={g} requirementId={x.id} scopes={r.scopes.map((sc) => sc.name)} />
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </PathItem>
        )}
        {r.steps.map((x, i) => (
          <PathItem
            key={x.id}
            n={i + 1 + (r.requirements.length ? 1 : 0)}
            title={x.title}
            color={ACTOR_COLOR[x.actor]}
            pill={<Pill color={ACTOR_COLOR[x.actor]}>{ACTOR_LABEL[x.actor]}</Pill>}
            duration={x.duration}
            done={done.includes(x.id)}
            next={nextId === x.id}
            open={shown === x.id}
            onOpen={() => setOpen(shown === x.id ? "" : x.id)}
            onDone={() => toggle(x.id)}
          >
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
            <div className="mt-2">
              <Cite ids={x.sourceIds} />
            </div>
          </PathItem>
        ))}
        {live && items.length > 0 && <Skeleton />}
      </ol>
      {!live && items.length > 0 && doneCount === items.length && (
        <p className="px-4 pb-2 pt-3 text-[14px] text-[var(--d-instant)]">All done. Your users can now click Connect {g.name}.</p>
      )}
    </section>
  );
}

function PathItem({
  n,
  title,
  pill,
  duration,
  color = "var(--ink-3)",
  done,
  next,
  open,
  onOpen,
  onDone,
  children,
}: {
  n: number;
  title: string;
  pill: React.ReactNode;
  duration?: string;
  color?: string;
  done: boolean;
  next: boolean;
  open: boolean;
  onOpen: () => void;
  onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className={`rounded-xl bg-row transition-shadow ${next ? "shadow-[inset_3px_0_0_var(--accent)]" : ""}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onDone}
          aria-pressed={done}
          aria-label={done ? `Mark "${title}" not done` : `Mark "${title}" done`}
          className="label mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full !text-[11px] transition-colors"
          style={done ? { background: "var(--d-instant)", color: "var(--bg)" } : { color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          {done ? "✓" : n}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} aria-expanded={open} className="flex min-h-7 w-full flex-wrap items-center gap-2 text-left">
            {next && <span className="label !text-[11px] text-accent">Next</span>}
            <span className={`text-[16px] font-medium ${done ? "text-ink-3 line-through" : ""}`}>{title}</span>
            {pill}
            {duration && <span className="label ml-auto !text-[11px] text-ink-3">{duration}</span>}
          </button>
          {open && <div className="rise">{children}</div>}
        </div>
      </div>
    </li>
  );
}

// Every step as one bar segment: colour says who does it, width says how long (log scale, so a
// 6-week review doesn't flatten the 5-minute steps). Unknown durations are hatched.
function Journey({ steps, done, onPick }: { steps: Resolved["steps"]; done: string[]; onPick: (id: string) => void }) {
  const segs = steps.map((x) => {
    const m = minutes(x.duration);
    return { x, m, w: Math.log10((m ?? 60 * 24 * 7) + 10) };
  });
  const total = segs.reduce((a, b) => a + b.w, 0);
  return (
    <div className="px-3.5 pb-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Time per step">
        {segs.map(({ x, m, w }) => (
          <button
            key={x.id}
            type="button"
            title={`${x.title}: ${x.duration}`}
            onClick={() => onPick(x.id)}
            className="grow-x h-full transition-opacity hover:opacity-70"
            style={{
              width: `${((w / total) * 100).toFixed(2)}%`,
              ...(m == null
                ? { backgroundImage: `repeating-linear-gradient(45deg, ${ACTOR_COLOR[x.actor]} 0 4px, transparent 4px 8px)` }
                : { backgroundColor: ACTOR_COLOR[x.actor] }),
              opacity: done.includes(x.id) ? 0.35 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
        {(["agent", "you", "provider"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: ACTOR_COLOR[k] }} />
            {k === "provider" ? "Waiting on provider" : ACTOR_LABEL[k]}
          </span>
        ))}
        <span className="ml-auto">Width shows how long each step takes</span>
      </div>
    </div>
  );
}

const LINK_ICON: Record<string, string> = { register: "＋", console: "⌘", review: "✓", docs: "≡", support: "?", status: "●" };

function WhereToGo({ g, live }: { g: Guide; live: boolean }) {
  const [all, setAll] = useState(false);
  if (!g.links.length && !live && !g.portal) return null;
  const every = g.links.length ? g.links : g.portal ? [{ kind: "console" as const, label: `Open the ${g.name} developer portal`, url: g.portal }] : [];
  const links = all ? every : every.slice(0, 5);
  return (
    <section className="rounded-2xl bg-card p-1.5" aria-label="Where to go">
      <h2 className="label px-3.5 pb-3 pt-3 text-ink">Where to go</h2>
      <div className="rows flex flex-col gap-1">
        {links.length === 0 && <Skeleton />}
        {links.map((l) => (
          <a
            key={l.url + l.label}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${l.kind === "register" ? "bg-accent text-on-accent" : "bg-row hover:bg-row-hover"}`}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]"
              style={l.kind === "register" ? { background: "color-mix(in srgb, var(--on-accent) 18%, transparent)" } : { background: "var(--card)" }}
            >
              {LINK_ICON[l.kind]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{l.label}</span>
              {"note" in l && l.note && <span className={`block text-[12px] ${l.kind === "register" ? "opacity-75" : "text-ink-3"}`}>{l.note}</span>}
            </span>
            <span className="transition-transform group-hover:translate-x-0.5">↗</span>
          </a>
        ))}
      </div>
      {every.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="label px-3.5 py-3 !text-[11px] text-ink-3 hover:text-ink">
          {all ? "Show fewer −" : `${plural(every.length - 5, "more link")} +`}
        </button>
      )}
    </section>
  );
}

function Stuck({ r, live, Cite }: { r: Resolved; live: boolean; Cite: CiteFn }) {
  if (!r.blockers.length && !live) return null;
  return (
    <section className="rounded-2xl bg-card p-1.5" aria-label="If you get stuck">
      <h2 className="label px-3.5 pb-3 pt-3 text-ink">If you get stuck</h2>
      <div className="rows flex flex-col gap-1">
        {r.blockers.length === 0 && <Skeleton />}
        {r.blockers.map((x) => (
          <details key={x.id} className="group rounded-xl bg-row px-4 py-3">
            <summary className="flex cursor-pointer list-none items-start gap-2 text-[14px]">
              <span className="mt-0.5 shrink-0" style={{ color: "var(--d-gated)" }}>
                !
              </span>
              <span className="flex-1">{x.symptom}</span>
              <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
            </summary>
            <p className="mt-2 pl-4 text-[14px] leading-relaxed text-ink-2">
              <span style={{ color: "var(--d-instant)" }}>Fix: </span>
              {x.fix}
            </p>
            <div className="mt-2 pl-4">
              <Cite ids={x.sourceIds} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

// Limits and permissions: what to design around before you launch.
function BeforeLaunch({ r, live, Cite, style }: { r: Resolved; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
  if (!r.limits.length && !r.scopes.length && !live) return null;
  const tierColor = (t: string) => (t === "restricted" ? "var(--d-gated)" : t === "sensitive" ? "var(--d-moderate)" : "var(--d-instant)");
  return (
    <section className="rounded-2xl bg-card p-1.5" style={style} aria-label="Before you launch">
      <div className="px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Before you launch</h2>
        <p className="mt-1 text-[13px] text-ink-3">Caps, expiry and permissions to design around.</p>
      </div>
      <div className="rows grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {r.limits.length === 0 && live && <Skeleton />}
        {r.limits.map((x) => (
          <div key={x.id} className="rounded-xl bg-row p-4">
            <p className="text-[15px] font-medium">{x.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{x.detail}</p>
            <div className="mt-2">
              <Cite ids={x.sourceIds} />
            </div>
          </div>
        ))}
      </div>
      {r.scopes.length > 0 && (
        <div className="mt-1.5 rounded-xl bg-row p-4">
          <p className="label !text-[11px] text-ink-3">Permissions you ask for · sensitive and restricted ones trigger a review</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {r.scopes.map((x) => (
              <li key={x.name} className="grid gap-1 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <code className="break-all font-mono text-[12px]">{x.name}</code>
                <span className="text-[13px] text-ink-2">{x.meaning}</span>
                <span className="flex gap-1.5">
                  <Pill color={tierColor(x.tier)}>{x.tier}</Pill>
                  {x.triggersReview && <Pill color="var(--d-hard)">Review</Pill>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Sources({ g, style }: { g: Guide; style: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  // Citation links like [3] open this list.
  useEffect(() => {
    const onHash = () => location.hash.startsWith("#src-") && setOpen(true);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
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
            <Row key={x.id}>
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
              className={`label min-h-9 rounded-full px-3 !text-[11px] transition-colors ${on ? "bg-ink text-bg" : "bg-row text-ink-2 hover:text-ink"}`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ShareBar({ g, r, s, shareLink }: { g: Guide; r: Resolved; s: Situation; shareLink?: () => Promise<string> }) {
  const [done, setDone] = useState("");
  async function copy(kind: string, text: string | Promise<string>) {
    try {
      await navigator.clipboard.writeText(await text);
      setDone(kind);
    } catch {
      setDone("fail");
    }
    setTimeout(() => setDone(""), 1600);
  }
  const link = () => (shareLink ? shareLink() : Promise.resolve(location.href.split("#")[0]));
  if (done === "fail") return <p className="label text-ink-3">Copy was blocked by the browser. Select the text instead.</p>;
  const btn = "label inline-flex h-11 items-center justify-center px-4 transition-colors";
  return (
    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
      <button className={`${btn} bg-accent text-on-accent hover:opacity-90`} onClick={() => copy("prompt", toAgentPrompt(g, r, s))}>
        {done === "prompt" ? "Copied" : "Copy prompt for your agent"}
      </button>
      <button className={`${btn} bg-card text-ink hover:bg-row-hover`} onClick={() => copy("md", link().then((u) => toMarkdown(g, r, s, u)))}>
        {done === "md" ? "Copied" : "Copy Markdown"}
      </button>
      <button className={`${btn} bg-card text-ink hover:bg-row-hover`} onClick={() => copy("link", link())}>
        {done === "link" ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
