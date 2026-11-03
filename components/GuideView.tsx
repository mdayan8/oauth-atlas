"use client";

import { useEffect, useState } from "react";
import type { Guide } from "@/lib/schema";
import { claimBadge, defaultSituation, resolve, type Audience, type Profile, type Resolved, type Situation } from "@/lib/situation";
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
        <SituationBar g={g} sit={sit} r={r} set={set} style={beat(1)} />
        <Path g={g} r={r} live={live} Cite={Cite} style={beat(2)} />
        <Details g={g} r={r} live={live} Cite={Cite} style={beat(3)} />
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

function SituationBar({
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
  return (
    <section className="rounded-2xl bg-card px-5 py-4" style={style} aria-label="Your situation">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="label text-ink">Your situation</h2>
        <p className="text-[12px] text-ink-3">
          {r.hidden > 0 ? `Tailored: ${plural(r.hidden, "item")} that don't apply to you are hidden.` : "Pick what fits. The guide updates instantly."}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-8">
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
    </section>
  );
}

// One path from start to approved: get the requirements ready, then each step in order.
// Only the next step is open; the rest are one line each. Progress is kept per guide in this browser.
function Path({ g, r, live, Cite, style }: { g: Guide; r: Resolved; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
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
    <section id="path" className="scroll-mt-24 rounded-2xl bg-card p-1.5" style={style}>
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

// Everything that isn't a step, in one place, so the page stays short.
function Details({ g, r, live, Cite, style }: { g: Guide; r: Resolved; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
  const tabs = [
    { id: "blockers", label: "If you get stuck", n: r.blockers.length },
    { id: "limits", label: "Limits and gotchas", n: r.limits.length },
    { id: "scopes", label: "Permissions", n: r.scopes.length },
    { id: "evidence", label: "Sources", n: g.sources.length },
  ];
  const [tab, setTab] = useState("blockers");
  // Citation links like [3] jump to the Sources tab.
  useEffect(() => {
    const onHash = () => location.hash.startsWith("#src-") && setTab("evidence");
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const empty = (t: string) => (live ? <Skeleton /> : <Empty>{t}</Empty>);

  return (
    <section className="rounded-2xl bg-card p-1.5" style={style}>
      <div role="tablist" aria-label="Details" className="flex gap-1 overflow-x-auto px-1.5 pb-2 pt-1.5 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`label min-h-9 shrink-0 rounded-full px-3 !text-[11px] transition-colors ${tab === t.id ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
          >
            {t.label} <span className="opacity-60">{t.n}</span>
          </button>
        ))}
      </div>
      <div key={tab} className="rows flex flex-col gap-1" role="tabpanel">
        {tab === "blockers" &&
          (r.blockers.length === 0
            ? empty("No known blockers.")
            : r.blockers.map((x) => (
                <Row key={x.id} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="label !text-[11px] text-[var(--d-gated)]">You see</p>
                    <p className="mt-1 text-[15px]">{x.symptom}</p>
                  </div>
                  <div>
                    <p className="label !text-[11px] text-[var(--d-instant)]">Do this</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{x.fix}</p>
                    <div className="mt-2">
                      <Cite ids={x.sourceIds} />
                    </div>
                  </div>
                </Row>
              )))}
        {tab === "limits" &&
          (r.limits.length === 0
            ? empty("None found.")
            : r.limits.map((x) => (
                <Row key={x.id}>
                  <p className="text-[16px] font-medium">{x.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
                  <div className="mt-2">
                    <Cite ids={x.sourceIds} />
                  </div>
                </Row>
              )))}
        {tab === "scopes" && (
          <>
            <p className="px-3.5 pb-2 text-[13px] text-ink-3">Sensitive and restricted permissions are what trigger a review. Ask for the fewest you can.</p>
            {r.scopes.length === 0
              ? empty("No permission list found.")
              : r.scopes.map((x) => (
                  <Row key={x.name} className="grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                    <code className="break-all font-mono text-[13px] text-ink">{x.name}</code>
                    <span className="text-[14px] text-ink-2">{x.meaning}</span>
                    <span className="flex flex-wrap gap-1.5 sm:justify-end">
                      <Pill color={x.tier === "restricted" ? "var(--d-gated)" : x.tier === "sensitive" ? "var(--d-moderate)" : "var(--d-instant)"}>{x.tier}</Pill>
                      {x.triggersReview && <Pill color="var(--d-hard)">Review</Pill>}
                    </span>
                  </Row>
                ))}
          </>
        )}
        {tab === "evidence" && (
          <>
            <p className="px-3.5 pb-2 text-[13px] leading-relaxed text-ink-3">
              Every line shows how sure we are. Tested by agent: we fetched it live. Official docs: the provider says so. Third-party: only
              blogs or vendors say so. Unverified: no source yet, so check it yourself.
            </p>
            {g.sources.length === 0 && empty("No sources.")}
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
          </>
        )}
      </div>
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
