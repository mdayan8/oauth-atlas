"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Guide } from "@/lib/schema";
import { ACTOR_LABEL, DIFFICULTY_LABEL } from "@/lib/share";
import { DIFF_COLOR, Meter, Pill, Skeleton } from "./ui";

// Generative UI: Claude answers by choosing components (verdict, comparison, steps, warning, links,
// follow-up choices) through tool calls. Each one renders here as it streams; tapping a choice is the next turn.

const ACTOR_COLOR = { agent: "var(--accent)", you: "var(--ink)", provider: "var(--d-moderate)" } as const;
type Part = { type: string; toolCallId?: string; state?: string; input?: any; text?: string };
type CiteFn = (p: { ids?: string[] }) => React.ReactNode;

// A free model answers with one "answer" call holding every component; split it back into components.
const ORDER = ["set_situation", "say", "show_verdict", "show_compare", "show_steps", "show_warning", "show_links", "offer_choices"];
const expand = (parts: Part[]): Part[] =>
  parts.flatMap((p) => {
    if (p.type !== "tool-answer") return [p];
    const input = { ...(p.input ?? {}) };
    // A reply that only re-shaped the guide still says so, so the developer never gets a silent answer.
    if (!input.say && input.set_situation && p.state === "output-available")
      input.say = { text: `Updated the guide for: ${input.set_situation.summary || "your situation"}. The verdict, path and steps now match.`, sourceIds: [] };
    return ORDER.filter((k) => input[k]).map((k) => ({ type: `tool-${k}`, toolCallId: `${p.toolCallId}-${k}`, state: p.state, input: input[k] }));
  });

type Preset = { profile?: "individual" | "startup" | "company" | null; audience?: "few" | "many" | null; needs?: string[] | null };

export default function AskPanel({ g, Cite, onSituation }: { g: Guide; Cite: CiteFn; onSituation: (p: Preset) => void }) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ask", body: g.generated ? { guide: g } : { slug: g.slug } }),
    [g],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  // When the agent reads the developer's situation, re-shape the guide once per call.
  const applied = useRef(new Set<string>());
  useEffect(() => {
    for (const m of messages)
      for (const p of expand(m.parts as Part[]))
        if (p.type === "tool-set_situation" && p.state === "output-available" && p.toolCallId && !applied.current.has(p.toolCallId)) {
          applied.current.add(p.toolCallId);
          const known = new Set(g.needs.map((n) => n.id));
          onSituation({ profile: p.input?.profile, audience: p.input?.audience, needs: p.input?.needs?.filter((n: string) => known.has(n)) || null });
        }
  }, [messages, g.needs, onSituation]);
  const [q, setQ] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setQ("");
  };

  // Only the latest answer is shown, in place: this is a line that re-shapes the guide, not a chat transcript.
  const latest = [...messages].reverse().find((m) => m.role === "assistant");
  const asked = [...messages].reverse().find((m) => m.role === "user")?.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

  return (
    <section id="ask" className="scroll-mt-24 rounded-2xl bg-card p-1.5" aria-label={`Tell the guide about you`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex flex-col gap-2 rounded-xl bg-row px-3 py-3 sm:flex-row sm:items-center sm:px-4"
      >
        <label htmlFor="ask-input" className="label flex shrink-0 items-center gap-2 text-accent">
          <span className={`h-2 w-2 rounded-full bg-accent ${busy ? "pulse-dot" : ""}`} />
          In your words
        </label>
        <input
          id="ask-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={300}
          placeholder={`I'm building ... for ... and my agent needs to ... in ${g.name}`}
          className="h-11 min-w-0 flex-1 rounded-[4px] bg-card px-4 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-ink-3 focus:ring-2 focus:ring-accent"
        />
        <button disabled={busy || !q.trim()} className="label h-11 shrink-0 bg-accent px-5 text-on-accent hover:opacity-90 disabled:opacity-40">
          Ask
        </button>
      </form>
      {(latest || status === "submitted" || error) && (
        <div className="flex flex-col gap-2 px-1.5 pb-1.5 pt-2" aria-live="polite">
          {asked && <p className="label px-2 !text-[10px] text-ink-3">For: {asked}</p>}
          {latest && expand(latest.parts as Part[]).map((p, i) => <Block key={p.toolCallId ?? i} p={p} Cite={Cite} onChoose={ask} busy={busy} />)}
          {status === "submitted" && (
            <div className="rise rounded-xl bg-row px-4 py-3.5">
              <p className="label flex items-center gap-2 text-ink-2">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                Reading the {g.name} guide ({g.sources.length} sources), re-shaping it for you
              </p>
              <Skeleton bare />
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-row px-4 py-3 text-[14px] text-ink-2">
              {error.message.includes("missing_key") ? "This needs an AI key on the server. Everything else on this page works without it." : `The agent hit an error: ${error.message.slice(0, 160)}`}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Block({ p, Cite, onChoose, busy }: { p: Part; Cite: CiteFn; onChoose: (t: string) => void; busy: boolean }) {
  const i = p.input ?? {};
  const card = "rise rounded-2xl bg-row px-4 py-3.5";
  const head = "label !text-[11px] text-ink-3";
  switch (p.type) {
    case "tool-set_situation":
      // Free models sometimes skip the summary, so build one from what they did set.
      const summary = i.summary || [i.profile, i.audience === "many" ? "real users" : i.audience === "few" ? "testers" : null, ...(i.needs ?? [])].filter(Boolean).join(", ");
      return summary ? (
        <p className="rise mx-1 inline-flex w-fit items-center gap-2 rounded-full bg-row px-3 py-1.5 text-[13px]">
          <span style={{ color: "var(--d-instant)" }}>✓</span>
          Guide updated for: <span className="font-medium">{summary}</span>
        </p>
      ) : null;
    case "tool-say":
      return i.text ? (
        <p className="rise px-3 text-[16px] leading-relaxed">
          {i.text} {p.state === "output-available" && i.sourceIds?.length > 0 && <Cite ids={i.sourceIds} />}
        </p>
      ) : null;
    case "tool-show_verdict":
      return i.difficulty ? (
        <div className={card}>
          <p className={head}>{i.situation || "Your case"}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
            <p className="text-[30px] leading-none tracking-[-0.7px]" style={{ color: DIFF_COLOR[i.difficulty as keyof typeof DIFF_COLOR] }}>
              {DIFFICULTY_LABEL[i.difficulty as keyof typeof DIFFICULTY_LABEL]}
            </p>
            <p className="text-[14px]">
              <span className="label !text-[10px] text-ink-3">Your time</span> {i.handsOn}
              <span className="mx-2 text-ink-3">·</span>
              <span className="label !text-[10px] text-ink-3">Waiting</span> {i.waiting}
            </p>
          </div>
          <div className="mt-3 max-w-md">
            <Meter d={i.difficulty} />
          </div>
          {i.why && <p className="mt-3 text-[14px] text-ink-2">{i.why}</p>}
          {p.state === "output-available" && i.sourceIds?.length > 0 && (
            <div className="mt-2">
              <Cite ids={i.sourceIds} />
            </div>
          )}
        </div>
      ) : (
        <Skeleton />
      );
    case "tool-show_compare": {
      const cols: string[] = Array.isArray(i.columns) ? i.columns : [];
      const rows: { label?: string; cells?: string[] }[] = Array.isArray(i.rows) ? i.rows : [];
      return (
        <div className={`${card} overflow-x-auto`}>
          {i.title && <p className={head}>{i.title}</p>}
          <div className="mt-2 grid min-w-[420px] gap-x-4 gap-y-2 text-[14px]" style={{ gridTemplateColumns: `minmax(100px,0.8fr) repeat(${Math.max(cols.length, 1)}, minmax(0,1fr))` }}>
            <span />
            {cols.map((c) => (
              <span key={c} className="text-[14px] font-medium">
                {c}
              </span>
            ))}
            {rows.map((r, k) => (
              <Row3 key={k} label={r.label ?? ""} cells={r.cells ?? []} n={cols.length} />
            ))}
          </div>
        </div>
      );
    }
    case "tool-show_steps": {
      const steps: { title?: string; actor?: keyof typeof ACTOR_COLOR; duration?: string }[] = Array.isArray(i.steps) ? i.steps : [];
      return (
        <div className={card}>
          {i.title && <p className={head}>{i.title}</p>}
          <ol className="mt-2 flex flex-col gap-2">
            {steps.filter((x) => x.title).map((x, k) => {
              const a = x.actor && ACTOR_COLOR[x.actor] ? x.actor : "you";
              return (
                <li key={k} className="flex flex-wrap items-center gap-2 text-[15px]">
                  <span className="label grid h-6 w-6 place-items-center rounded-full !text-[10px]" style={{ color: ACTOR_COLOR[a], background: `color-mix(in srgb, ${ACTOR_COLOR[a]} 10%, transparent)` }}>
                    {k + 1}
                  </span>
                  {x.title}
                  <Pill color={ACTOR_COLOR[a]}>{ACTOR_LABEL[a]}</Pill>
                  {x.duration && <span className="label ml-auto !text-[11px] text-ink-3">{x.duration}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      );
    }
    case "tool-show_warning":
      return i.title ? (
        <div className="rise rounded-2xl px-4 py-3.5" style={{ background: "color-mix(in srgb, var(--d-hard) 10%, var(--row))" }}>
          <p className="text-[15px] font-medium" style={{ color: "var(--d-hard)" }}>
            {i.title}
          </p>
          <p className="mt-1 text-[14px] text-ink-2">{i.detail}</p>
          {p.state === "output-available" && i.sourceIds?.length > 0 && (
            <div className="mt-2">
              <Cite ids={i.sourceIds} />
            </div>
          )}
        </div>
      ) : null;
    case "tool-show_links": {
      const links: { label?: string; url?: string }[] = Array.isArray(i.links) ? i.links : [];
      return (
        <div className="rise flex flex-wrap gap-2 px-1">
          {links.filter((l) => l.url?.startsWith("https://")).map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="label inline-flex h-10 items-center gap-2 bg-row px-4 !text-[11px] text-ink hover:text-accent">
              {l.label || l.url} ↗
            </a>
          ))}
        </div>
      );
    }
    case "tool-offer_choices": {
      const opts: string[] = Array.isArray(i.options) ? i.options.filter((o: unknown) => typeof o === "string") : [];
      return opts.length ? (
        <div className="rise flex flex-wrap items-baseline gap-x-4 gap-y-1 px-2 pt-1">
          <span className="label !text-[10px] text-ink-3">Worth asking next</span>
          {opts.map((o) => (
            <button key={o} disabled={busy} onClick={() => onChoose(o)} className="text-left text-[13px] text-accent underline decoration-[var(--accent-soft)] underline-offset-4 hover:decoration-[var(--accent)] disabled:opacity-50">
              {o}
            </button>
          ))}
        </div>
      ) : null;
    }
    case "tool-web_fetch":
      return (
        <p className="label px-3 !text-[11px] text-ink-3">
          {p.state === "output-available" ? "Checked" : "Checking"} {hostOf(i.url) || "an official page"}
        </p>
      );
    default:
      return null;
  }
}

function Row3({ label, cells, n }: { label: string; cells: string[]; n: number }) {
  return (
    <>
      <span className="text-ink-3">{label}</span>
      {Array.from({ length: Math.max(n, 1) }, (_, k) => (
        <span key={k} className="text-ink-2">
          {cells[k] ?? ""}
        </span>
      ))}
    </>
  );
}

function hostOf(u: unknown) {
  try {
    return typeof u === "string" ? new URL(u).host : "";
  } catch {
    return "";
  }
}
