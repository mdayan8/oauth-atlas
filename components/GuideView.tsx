"use client";

import { useMemo, useState } from "react";
import type { Guide } from "@/lib/schema";
import { claimBadge, defaultSituation, resolve, type Audience, type Profile, type Situation } from "@/lib/situation";
import { ACTOR_LABEL, DIFFICULTY_LABEL, toAgentPrompt, toMarkdown } from "@/lib/share";
import { DIFF_COLOR, DifficultyPill, Empty, EvidenceBadge, Meter, Pill, Row, Section } from "./ui";

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
  const r = useMemo(() => resolve(g, sit), [g, sit]);
  const set = (p: Partial<Situation>) => {
    setTouched(true);
    setS({ ...sit, ...p });
  };

  const srcNum = (id: string) => g.sources.findIndex((x) => x.id === id) + 1;
  const Cite = ({ ids }: { ids?: string[] }) => {
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

  const v = r.verdict;
  const counts = { agent: 0, you: 0, provider: 0 };
  r.steps.forEach((x) => counts[x.actor]++);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-6 pb-10 pt-10 sm:pt-14 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="label text-accent">OAuth app guide{g.generated && " · generated live"}</p>
          <h1 className="h-display mt-4">{g.name || "Investigating..."}</h1>
          {g.summary && <p className="mt-4 text-[18px] leading-relaxed text-ink-2">{g.summary}</p>}
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
        {!live && <ShareBar g={g} r={r} s={sit} shareLink={shareLink} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        {/* Left: verdict + situation, the controls */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-2xl">
          <section className="rounded-2xl bg-card p-1.5" aria-live="polite">
            <div className="rounded-xl bg-row p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="label text-ink-3">Verdict</h2>
                {v && <Cite ids={v.sourceIds} />}
              </div>
              {v ? (
                <>
                  <p className="mt-3 text-[36px] leading-none tracking-[-0.9px]" style={{ color: DIFF_COLOR[v.difficulty] }}>
                    {DIFFICULTY_LABEL[v.difficulty]}
                  </p>
                  <div className="mt-5">
                    <Meter d={v.difficulty} />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-card px-3 py-3">
                      <p className="label !text-[10px] text-ink-3">Your hands-on time</p>
                      <p className="mt-1 text-[18px] leading-tight">{v.handsOn}</p>
                    </div>
                    <div className="rounded-lg bg-card px-3 py-3">
                      <p className="label !text-[10px] text-ink-3">Waiting on {g.name || "provider"}</p>
                      <p className="mt-1 text-[18px] leading-tight">{v.waiting}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-ink-2">{v.why}</p>
                </>
              ) : (
                <p className="mt-3 text-[14px] text-ink-3">{live ? "The agent sets this once it has evidence." : "No verdict."}</p>
              )}
            </div>

            <div className="mt-1.5 rounded-xl bg-row p-5">
              <h2 className="label text-ink-3">Your situation</h2>
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
              <p className="mt-4 text-[12px] text-ink-3">
                {r.hidden > 0
                  ? `${r.hidden} item${r.hidden === 1 ? "" : "s"} hidden because they do not apply to you.`
                  : "Everything below applies to you."}
              </p>
            </div>
          </section>
        </aside>

        {/* Right: the guide */}
        <div className="flex min-w-0 flex-col gap-4">
          <Section id="skip" title="Can you skip it?">
            <Row>
              <SkipLine label="Composio-managed auth" value={g.skip.composioManaged} />
              <SkipLine label="MCP with auto-registration (DCR)" value={g.skip.mcpDcr} hint={g.skip.mcpServer} />
              {g.skip.note && (
                <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                  {g.skip.note} <Cite ids={g.skip.sourceIds} />
                </p>
              )}
            </Row>
            {g.skip.whyOwnApp.length > 0 && (
              <Row>
                <p className="label !text-[11px] text-ink-3">Reasons to register your own app anyway</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-ink-2">
                  {g.skip.whyOwnApp.map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="text-accent">→</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </Row>
            )}
          </Section>

          <Section id="requirements" title="Requirements" count={r.requirements.length}>
            {r.requirements.length === 0 && <Empty>{live ? "Looking for requirements..." : "Nothing special. A developer account is enough."}</Empty>}
            {r.requirements.map((x) => (
              <Row key={x.id}>
                <label className="flex cursor-pointer gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-medium">{x.label}</span>
                      {x.agentCanDraft && <Pill color="var(--accent)">Agent can draft</Pill>}
                    </span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-ink-2">{x.detail}</span>
                    <span className="mt-2 block">
                      <Cite ids={x.sourceIds} />
                    </span>
                  </span>
                </label>
              </Row>
            ))}
          </Section>

          <Section
            id="steps"
            title="Steps"
            count={r.steps.length}
            aside={
              r.steps.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <Pill color={ACTOR_COLOR.agent}>{counts.agent} agent</Pill>
                  <Pill color={ACTOR_COLOR.you}>{counts.you} you</Pill>
                  <Pill color={ACTOR_COLOR.provider}>{counts.provider} waiting</Pill>
                </div>
              )
            }
          >
            {r.steps.length === 0 && <Empty>{live ? "Mapping the steps..." : "No steps."}</Empty>}
            {r.steps.map((x, i) => (
              <Row key={x.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className="label grid h-7 w-7 place-items-center rounded-full !text-[11px]"
                    style={{ color: ACTOR_COLOR[x.actor], background: `color-mix(in srgb, ${ACTOR_COLOR[x.actor]} 10%, transparent)` }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-medium">{x.title}</span>
                    <Pill color={ACTOR_COLOR[x.actor]}>{ACTOR_LABEL[x.actor]}</Pill>
                    <span className="label ml-auto !text-[11px] text-ink-3">{x.duration}</span>
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
                  <div className="mt-2">
                    <Cite ids={x.sourceIds} />
                  </div>
                </div>
              </Row>
            ))}
          </Section>

          {(r.scopes.length > 0 || live) && (
            <Section id="scopes" title="Permissions (scopes)" count={r.scopes.length}>
              {r.scopes.length === 0 && <Empty>Reading the scope list...</Empty>}
              {r.scopes.map((x) => (
                <Row key={x.name} className="grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <code className="break-all font-mono text-[13px] text-ink">{x.name}</code>
                  <span className="text-[14px] text-ink-2">{x.meaning}</span>
                  <span className="flex flex-wrap gap-1.5 sm:justify-end">
                    <Pill color={x.tier === "restricted" ? "var(--d-gated)" : x.tier === "sensitive" ? "var(--d-moderate)" : "var(--d-instant)"}>
                      {x.tier}
                    </Pill>
                    {x.triggersReview && <Pill color="var(--d-hard)">Review</Pill>}
                  </span>
                </Row>
              ))}
            </Section>
          )}

          <Section id="limits" title="Limits and gotchas" count={r.limits.length}>
            {r.limits.length === 0 && <Empty>{live ? "Checking quotas and caps..." : "None found."}</Empty>}
            {r.limits.map((x) => (
              <Row key={x.id}>
                <p className="text-[16px] font-medium">{x.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{x.detail}</p>
                <div className="mt-2">
                  <Cite ids={x.sourceIds} />
                </div>
              </Row>
            ))}
          </Section>

          <Section id="blockers" title="If you get blocked" count={r.blockers.length}>
            {r.blockers.length === 0 && <Empty>{live ? "Looking for known blockers..." : "None found."}</Empty>}
            {r.blockers.map((x) => (
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
            ))}
          </Section>

          <Section id="evidence" title="Evidence" count={g.sources.length}>
            {g.sources.length === 0 && <Empty>{live ? "Sources appear here as the agent cites them." : "No sources."}</Empty>}
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
          </Section>
        </div>
      </div>
    </div>
  );
}

function SkipLine({ label, value, hint }: { label: string; value: "yes" | "no" | "unknown"; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[15px]">
        {label}
        {hint && <span className="ml-2 font-mono text-[12px] text-ink-3">{hint}</span>}
      </span>
      <Pill color={SKIP_COLOR[value]}>{SKIP_TEXT[value]}</Pill>
    </div>
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
    <fieldset className="mt-4">
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
              className={`label min-h-9 rounded-full px-3 !text-[11px] transition-colors ${
                on ? "bg-ink text-bg" : "bg-card text-ink-2 hover:text-ink"
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ShareBar({
  g,
  r,
  s,
  shareLink,
}: {
  g: Guide;
  r: ReturnType<typeof resolve>;
  s: Situation;
  shareLink?: () => Promise<string>;
}) {
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
  if (done === "fail") return <p className="label text-ink-3 lg:ml-auto">Copy was blocked by the browser. Select the text instead.</p>;
  const btn = "label inline-flex h-11 items-center justify-center px-4 transition-colors";
  return (
    <div className="flex flex-wrap gap-2 lg:ml-auto">
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
