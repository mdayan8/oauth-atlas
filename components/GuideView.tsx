"use client";

import { useCallback, useEffect, useState } from "react";
import type { Guide, LinkT, PathOptionT } from "@/lib/schema";
import AskPanel from "./AskPanel";
import { applyPreset, claimBadge, defaultSituation, pickVerdict, resolve, type Audience, type Profile, type Resolved, type Situation } from "@/lib/situation";
import { ACTOR_LABEL, BADGE_LABEL, DIFFICULTY_LABEL, situationLine, toAgentPrompt, toMarkdown } from "@/lib/share";
import { CopyButton, DraftButton, Recheck } from "./AgentActions";
import { BADGE_COLOR, DIFF_COLOR, EvidenceBadge, Meter, Pill, Row, Skeleton } from "./ui";

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
  // Stable so the Ask panel's effect does not re-run on every render.
  const onSituation = useCallback(
    (p: Parameters<typeof applyPreset>[1]) => {
      setTouched(true);
      setS((cur) => applyPreset(cur, p));
    },
    [],
  );
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const srcNum = (id: string) => g.sources.findIndex((x) => x.id === id) + 1;
  const Cite: CiteFn = ({ ids }) => {
    const nums = (ids ?? []).map(srcNum).filter((n) => n > 0);
    return (
      <span className="inline-flex flex-wrap items-center gap-1 align-middle" title={BADGE_LABEL[claimBadge(ids, g.sources)]}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BADGE_COLOR[claimBadge(ids, g.sources)] }} aria-label={BADGE_LABEL[claimBadge(ids, g.sources)]} />
        {nums.map((n) => (
          <a
            key={n}
            href={`#src-${n}`}
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("atlas:source", { detail: n }));
            }}
            className="label !text-[11px] text-ink-3 underline-offset-2 hover:text-accent hover:underline"
          >
            [{n}]
          </a>
        ))}
      </span>
    );
  };

  return (
    <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${live ? "live" : ""} ${settled ? "settled" : ""}`}>
      <div className="build relative flex flex-col gap-6 pb-8 pt-10 sm:pt-14 lg:flex-row lg:items-end">
        <div aria-hidden className="glow pointer-events-none absolute -left-40 -top-40 h-[480px] w-[820px] max-w-[100vw] opacity-70" />
        <div className="relative max-w-2xl">
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
            {g.checked && <> · <span className="whitespace-nowrap">Last checked {g.checked}</span></>}
          </p>
        </div>
        {!live && (
          <div className="relative hidden shrink-0 lg:ml-auto lg:block">
            <ShareBar g={g} r={r} s={sit} shareLink={shareLink} />
          </div>
        )}
      </div>

      <div className="build flex flex-col gap-4">
        <QuickAnswer g={g} r={r} s={sit} live={live} Cite={Cite} style={beat(0)} />
        {!live && (
          <div className="lg:hidden" style={beat(1)}>
            <ShareBar g={g} r={r} s={sit} shareLink={shareLink} />
          </div>
        )}
        <PathChooser g={g} sit={sit} r={r} set={set} style={beat(1)} />
        <div style={beat(2)}>
          <Path g={g} r={r} sit={sit} live={live} Cite={Cite} />
        </div>
        {!live && g.name && <AskDrawer g={g} Cite={Cite} onSituation={onSituation} />}
        <div className="grid gap-4 md:grid-cols-2 md:items-start" style={beat(3)}>
          <WhereToGo g={g} live={live} />
          <Stuck r={r} live={live} Cite={Cite} />
        </div>
        <BeforeLaunch r={r} live={live} Cite={Cite} style={beat(5)} />
        <Sources g={g} style={beat(6)} />
      </div>
    </div>
  );
}

// The brief's four questions, answered in plain words before any detail.
function QuickAnswer({ g, r, s, live, Cite, style }: { g: Guide; r: Resolved; s: Situation; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
  const v = r.verdict;
  const time = (x: string) => (/^not published$/i.test(x.trim()) ? "No estimate published" : x);
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
              <a href="#paths" className="label mt-3 block !text-[10px] text-ink-3 hover:text-ink">
                For: {situationLine(g, s)} · change
              </a>
            </>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
        <div className={tile}>
          <p className={head}>How long</p>
          {v ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-[16px] leading-snug">
                <span className="label block !text-[10px] text-ink-3">Your time</span>
                {time(v.handsOn)}
              </p>
              <p className="text-[16px] leading-snug">
                <span className="label block !text-[10px] text-ink-3">Waiting on {name}</span>
                {time(v.waiting)}
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
              {(["agent", "you", "provider"] as const)
                .filter((k) => counts[k] > 0)
                .map((k) => (
                  <li key={k} className="flex items-center justify-between gap-2">
                    <Pill color={ACTOR_COLOR[k]}>{ACTOR_LABEL[k]}</Pill>
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
        {skip && (
          <div className="rounded-xl px-4 py-3" style={{ background: `color-mix(in srgb, ${g.skip.composioManaged === "yes" || g.skip.mcpDcr === "yes" ? "var(--d-instant)" : "var(--ink-3)"} 8%, var(--row))` }}>
            <p className="label !text-[10px]" style={{ color: g.skip.composioManaged === "yes" || g.skip.mcpDcr === "yes" ? "var(--d-instant)" : "var(--ink-3)" }}>
              {g.skip.composioManaged === "yes" || g.skip.mcpDcr === "yes" ? "Quickest path" : "No shortcut"}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed">
              {skip.replace(/^Quickest path: /, "")} {g.skip.sourceIds.length > 0 && <Cite ids={g.skip.sourceIds} />}
            </p>
          </div>
        )}
        {v?.why && (
          <p className="text-[14px] leading-relaxed text-ink-2">
            {v.why} <Cite ids={v.sourceIds} />
          </p>
        )}
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
  const apply = (p: PathOptionT) => applyPreset(sit, p.set);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const isOn = (p: PathOptionT) =>
    (!p.set.audience || p.set.audience === sit.audience) && (!p.set.profile || p.set.profile === sit.profile) && (!p.set.needs || same(p.set.needs, sit.needs));
  const skip = g.skip.composioManaged === "yes" ? "Use Composio's managed app" : g.skip.mcpDcr === "yes" ? `Use ${g.name}'s MCP server` : "";

  return (
    <section id="paths" className="scroll-mt-24 rounded-2xl bg-card p-1.5" style={style} aria-label="Choose your path">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Choose your path</h2>
        <p className="text-[12px] text-ink-3">{r.hidden > 0 ? `Hiding ${plural(r.hidden, "item")} that don't apply to this path.` : "Pick the one closest to you."}</p>
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
                onClick={() => set(applyPreset(sit, p.set))}
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
        {tune ? "Hide adjustments" : "Adjust: who you are, what your agent needs"} {tune ? "−" : "+"}
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

// One path from start to approved, as a vertical timeline: get the requirements ready, then each step.
// Only the next step is open, with a clear "Mark done". Progress is kept per guide in this browser.
function Path({ g, r, sit, live, Cite }: { g: Guide; r: Resolved; sit: Situation; live: boolean; Cite: CiteFn }) {
  const key = g.slug && !g.generated ? `atlas-progress:${g.slug}` : "";
  const signup = g.links.find((l) => l.kind === "register") ?? g.links.find((l) => l.kind === "console");
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
  const composioId = "composio";
  const drafts = r.requirements.filter((x) => x.agentCanDraft).length;
  const items = [
    ...(r.requirements.length
      ? [{ id: prepId, title: "Get these ready", actor: "you" as const, meta: drafts ? `${plural(r.requirements.length, "item")}, ${drafts} the agent can draft` : plural(r.requirements.length, "item") }]
      : []),
    ...r.steps.map((x) => ({ id: x.id, title: x.title, actor: x.actor, meta: x.duration })),
    // Last mile for Composio users: plug the new app into a custom auth config.
    ...(g.skip.composioManaged !== "unknown" ? [{ id: composioId, title: "Connect your app to Composio", actor: "you" as const, meta: "5 min" }] : []),
  ];
  const nextId = items.find((x) => !done.includes(x.id))?.id;
  const shown = open ?? nextId;
  const doneCount = items.filter((x) => done.includes(x.id)).length;

  const body = (id: string) => {
    if (id === prepId)
      return (
        <ul className="flex flex-col gap-0.5">
          {r.requirements.map((x) => (
            <li key={x.id}>
              <details className="group rounded-lg px-2 py-2 open:bg-row">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[15px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink-3)]" />
                  <span className="min-w-0 flex-1">{x.label}</span>
                  {x.agentCanDraft && <span className="label shrink-0 whitespace-nowrap !text-[10px] text-accent">Agent can draft</span>}
                  <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
                </summary>
                <p className="mt-1.5 pl-4 text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
                <div className="mt-2 pl-4">
                  <Cite ids={x.sourceIds} />
                  {x.agentCanDraft && !live && (
                    <div className="mt-2.5">
                      <DraftButton g={g} requirementId={x.id} scopes={r.scopes.map((sc) => sc.name)} situation={situationLine(g, sit)} />
                    </div>
                  )}
                  {/* An account, org or workspace to create: take them straight to the sign-up page. */}
                  {!x.agentCanDraft && /account|organization|organisation|workspace|partner|tenant|developer program/i.test(x.label) && signup && (
                    <div className="mt-2.5">
                      <LinkButton l={{ ...signup, label: `Create it: ${signup.label}` }} main />
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      );
    if (id === composioId)
      return (
        <>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[14px] leading-relaxed text-ink-2">
            <li>
              Register this as the authorized redirect URI in your {g.name} app:
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-md bg-card px-2 py-1 font-mono text-[12px] text-ink">{COMPOSIO_CALLBACK}</code>
                <CopyButton text={COMPOSIO_CALLBACK} label="Copy" />
              </span>
            </li>
            <li>In Composio, create an auth config for {g.name}, choose OAuth2, turn on Use your own developer credentials, and paste the client ID and secret. Set the same redirect URI there.</li>
            <li>Keep the client secret on your server. Use separate apps for staging and production.</li>
          </ol>
          <div className="mt-2">
            <EvidenceBadge badge="official" />
          </div>
          {!live && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LinkButton l={{ kind: "console", label: "Open Composio auth configs", url: "https://dashboard.composio.dev/" }} main />
              {COMPOSIO_GUIDES.has(g.slug) && <LinkButton l={{ kind: "docs", label: `Composio's ${g.name} guide`, url: `https://composio.dev/auth/${g.slug}` }} />}
              <LinkButton l={{ kind: "docs", label: "Composio docs", url: "https://docs.composio.dev/docs/authentication/white-labeling-authentication" }} />
              <MarkDone done={done.includes(id)} onClick={() => toggle(id)} />
            </div>
          )}
        </>
      );
    const x = r.steps.find((s) => s.id === id)!;
    const link = linkFor(g, `${x.title} ${x.detail}`, x.actor);
    const support = g.links.find((l) => l.kind === "support");
    return (
      <>
        <p className="text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
        <div className="mt-2">
          <Cite ids={x.sourceIds} />
        </div>
        {x.actor === "provider" && (
          <p className="mt-3 rounded-lg bg-card px-3 py-2.5 text-[13px] text-ink-2">
            Expected wait: <span className="text-ink">{x.duration || "not published"}</span>. Nothing to do but answer the reviewer quickly
            if they email you.
          </p>
        )}
        {!live && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {x.actor === "agent" && (
              <>
                <DraftButton g={g} stepId={x.id} scopes={r.scopes.map((sc) => sc.name)} label="Let the agent do it" situation={situationLine(g, sit)} />
                <CopyButton label="Copy prompt" text={stepPrompt(g, x.title, x.detail)} />
              </>
            )}
            {x.actor !== "agent" && link && <LinkButton l={link} main={x.actor === "you"} />}
            {x.actor === "provider" && support && support.url !== link?.url && <LinkButton l={support} />}
            <MarkDone done={done.includes(x.id)} onClick={() => toggle(x.id)} />
          </div>
        )}
      </>
    );
  };

  return (
    <section id="path" className="scroll-mt-24 rounded-2xl bg-card p-1.5">
      <div className="flex items-center gap-3 px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Your path</h2>
        {items.length > 0 && (
          <span className="label ml-auto text-ink-3">
            {doneCount}/{items.length} done
          </span>
        )}
      </div>
      {items.length > 0 && (
        <div className="mx-3.5 mb-2 h-0.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(doneCount / items.length) * 100}%`, background: "var(--d-instant)" }} />
        </div>
      )}
      <div className="rounded-xl bg-row px-4 pb-2 pt-5 sm:px-5">
        {items.length === 0 && (live ? <Skeleton bare tall /> : <p className="pb-3 text-[14px] text-ink-3">No steps.</p>)}
        <ol className="rows">
          {items.map((x, i) => {
            const isDone = done.includes(x.id);
            const isNext = x.id === nextId;
            const isOpen = x.id === shown;
            const c = ACTOR_COLOR[x.actor];
            const last = i === items.length - 1 && !live;
            return (
              <li key={x.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3.5">
                {/* node + connector */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => toggle(x.id)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `Mark "${x.title}" not done` : `Mark "${x.title}" done`}
                    className="label grid h-7 w-7 shrink-0 place-items-center rounded-full !text-[11px] transition-all"
                    style={
                      isDone
                        ? { background: "var(--d-instant)", color: "var(--bg)" }
                        : isNext
                          ? { background: c, color: "var(--bg)", boxShadow: `0 0 0 5px color-mix(in srgb, ${c} 16%, transparent)` }
                          : x.actor === "you"
                            ? { background: "var(--card)", color: "var(--ink-2)" }
                            : { background: `color-mix(in srgb, ${c} 12%, var(--row))`, color: c }
                    }
                  >
                    {isDone ? "✓" : i + 1}
                  </button>
                  {!last && (
                    <span className="my-1 w-0.5 flex-1 rounded-full transition-colors" style={{ background: isDone ? "var(--d-instant)" : "var(--line)", minHeight: 16 }} />
                  )}
                </div>
                {/* content */}
                <div className={`min-w-0 ${last ? "pb-3" : "pb-5"}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? "" : x.id)}
                    aria-expanded={isOpen}
                    className="group -mx-2 flex w-[calc(100%+16px)] items-start gap-3 rounded-lg px-2 py-0.5 text-left transition-colors hover:bg-card"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[16px] leading-7 ${isNext ? "font-medium" : ""} ${isDone ? "text-ink-3 line-through decoration-1" : ""}`}>{x.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px]">
                        <span className="label !text-[10px]" style={{ color: x.actor === "you" ? "var(--ink-2)" : c }}>
                          {x.id === prepId ? "Before you start" : ACTOR_LABEL[x.actor]}
                        </span>
                        {x.meta && <span className="text-ink-3">· {x.meta}</span>}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[14px] text-ink-3 transition-transform duration-200 group-hover:bg-row group-hover:text-ink"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                    >
                      ›
                    </span>
                  </button>
                  {isOpen && (
                    <div className="rise mt-3">
                      {body(x.id)}
                      {!live && x.id === prepId && (
                        <div className="mt-3">
                          <MarkDone done={isDone} onClick={() => toggle(x.id)} label="I have these" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {live && items.length > 0 && (
            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3.5 pb-3">
              <span className="shimmer h-7 w-7 rounded-full" />
              <Skeleton bare />
            </li>
          )}
        </ol>
        {!live && items.length > 0 && doneCount === items.length && (
          <p className="rise pb-3 text-[14px]" style={{ color: "var(--d-instant)" }}>
            All done. Your users can now click Connect {g.name}.
          </p>
        )}
      </div>
    </section>
  );
}

// From Composio's "Using your own OAuth apps" docs (checked 2026-11-04). Guides exist for these slugs at composio.dev/auth/<slug>.
const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";
const COMPOSIO_GUIDES = new Set(["github", "notion", "slack", "shopify", "linear"]);

function MarkDone({ done, onClick, label = "Mark done" }: { done: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="label inline-flex h-9 items-center gap-1.5 bg-card px-3.5 !text-[11px] text-ink transition-colors hover:text-[var(--d-instant)]"
    >
      {done ? (
        "Mark not done"
      ) : (
        <>
          <span style={{ color: "var(--d-instant)" }}>✓</span> {label}
        </>
      )}
    </button>
  );
}

function LinkButton({ l, main = false }: { l: LinkT; main?: boolean }) {
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noreferrer"
      className={`label inline-flex h-9 items-center gap-2 rounded-[4px] px-3.5 !text-[11px] transition-colors ${main ? "bg-accent text-on-accent hover:opacity-90" : "bg-card text-ink hover:text-accent"}`}
    >
      {l.label} ↗
    </a>
  );
}

// The official page that fits a step, picked from the guide's verified links by what the step is about.
function linkFor(g: Guide, text: string, actor: "agent" | "you" | "provider"): LinkT | undefined {
  const t = text.toLowerCase();
  const by = (...kinds: LinkT["kind"][]) => kinds.map((k) => g.links.find((l) => l.kind === k)).find(Boolean);
  if (actor === "provider" || /submit|review|verif|publish|listing|marketplace|quota/.test(t)) return by("review", "console");
  if (/create|register|new app|set up|client id|credential|consent screen|dashboard|enable/.test(t)) return by("register", "console");
  if (/install|test|manage|settings|store|distribution|redirect/.test(t)) return by("console", "register");
  return by("docs");
}

const stepPrompt = (g: Guide, title: string, detail: string) =>
  [
    `Do this step for my ${g.name} OAuth integration: ${title}.`,
    detail,
    "Read the client id and secret from environment variables, never hard-code them.",
    "Check what you rely on against these sources first:",
    ...g.sources.filter((s) => s.badge !== "unverified").slice(0, 6).map((s) => `- ${s.url}`),
    "If a source does not say it, tell me it is unverified instead of guessing.",
  ].join("\n");

const LINK_ICON: Record<string, string> = { register: "+", console: "⌘", review: "✓", docs: "≡", support: "?", status: "•" };

function WhereToGo({ g, live }: { g: Guide; live: boolean }) {
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

function Stuck({ r, live, Cite }: { r: Resolved; live: boolean; Cite: CiteFn }) {
  if (!r.blockers.length && !live) return null;
  return (
    <section className="rounded-2xl bg-card p-1.5" aria-label="If you get stuck">
      <h2 className="label px-3.5 pb-3 pt-3 text-ink">If you get stuck</h2>
      <div className="rounded-xl bg-row p-1.5">
        {r.blockers.length === 0 && <Skeleton bare tall />}
        <div className="rows flex flex-col">
          {r.blockers.map((x) => (
            <details key={x.id} className="group rounded-lg px-2.5 py-2.5 open:bg-card">
              <summary className="flex cursor-pointer list-none items-start gap-2.5 text-[14px]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--d-hard)" }} />
                <span className="min-w-0 flex-1 break-words">{x.symptom}</span>
                <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 pl-4 text-[14px] leading-relaxed text-ink-2">{x.fix}</p>
              <div className="mt-2 pl-4">
                <Cite ids={x.sourceIds} />
              </div>
            </details>
          ))}
        </div>
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
                <code className="whitespace-nowrap font-mono text-[12px]">{x.name}</code>
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
  const [fallback, setFallback] = useState("");
  async function copy(kind: string, text: string | Promise<string>) {
    const value = await text;
    try {
      await navigator.clipboard.writeText(value);
      setDone(kind);
      setTimeout(() => setDone(""), 1600);
    } catch {
      // Clipboard blocked (some embeds, automation): show the text preselected so one keystroke copies it.
      setFallback(value);
    }
  }
  const link = () => (shareLink ? shareLink() : Promise.resolve(location.href.split("#")[0]));
  if (fallback)
    return (
      <div className="w-full max-w-md">
        <p className="label mb-1 text-ink-3">Copy was blocked by the browser. The text is selected: press ⌘C or Ctrl+C.</p>
        <textarea readOnly autoFocus onFocus={(e) => e.currentTarget.select()} value={fallback} className="h-28 w-full rounded-lg bg-row p-2 font-mono text-[12px]" />
        <button onClick={() => setFallback("")} className="label mt-1 h-9 px-2 text-ink-3 hover:text-ink">Done</button>
      </div>
    );
  const btn = "label inline-flex h-11 items-center justify-center rounded-[4px] px-4 transition-colors";
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

// Ask lives in a drawer: one button that is always in reach, nothing pushed down the page.
function AskDrawer({ g, Cite, onSituation }: { g: Guide; Cite: CiteFn; onSituation: Parameters<typeof AskPanel>[0]["onSituation"] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label fixed bottom-5 right-5 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-5 text-on-accent shadow-[0_12px_30px_-10px_rgba(0,7,205,0.6)] transition-transform hover:-translate-y-0.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-on-accent" />
        Ask about {g.name}
      </button>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Ask about ${g.name}`}>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-bg p-2 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[480px] sm:max-h-none sm:rounded-none">
            <div className="flex justify-end px-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="label h-9 px-3 text-ink-3 hover:text-ink">
                Close ✕
              </button>
            </div>
            <AskPanel g={g} Cite={Cite} onSituation={onSituation} />
          </div>
        </div>
      )}
    </>
  );
}
