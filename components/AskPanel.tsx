"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import type { Guide } from "@/lib/schema";
import { ACTOR_LABEL, DIFFICULTY_LABEL } from "@/lib/share";
import { DIFF_COLOR, Meter, Pill, Skeleton } from "./ui";

// Generative UI: Claude answers by choosing components (verdict, comparison, steps, warning, links,
// follow-up choices) through tool calls. Each one renders here as it streams; tapping a choice is the next turn.

const ACTOR_COLOR = { agent: "var(--accent)", you: "var(--ink)", provider: "var(--d-moderate)" } as const;
type Part = { type: string; toolCallId?: string; state?: string; input?: any; text?: string };
type CiteFn = (p: { ids?: string[] }) => React.ReactNode;

export default function AskPanel({ g, Cite }: { g: Guide; Cite: CiteFn }) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ask", body: g.generated ? { guide: g } : { slug: g.slug } }),
    [g],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [q, setQ] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setQ("");
  };

  const suggestions = [
    ...g.paths.slice(1, 3).map((p) => `How hard is it for "${p.label}"?`),
    "What will the reviewer check?",
    "What can an agent do for me here?",
  ].slice(0, 4);

  return (
    <section id="ask" className="ice scroll-mt-24 rounded-3xl p-1.5" aria-label={`Ask about ${g.name}`}>
      <div className="px-4 pb-3 pt-4 sm:px-5">
        <p className="label flex items-center gap-2 text-accent">
          <span className={`h-2 w-2 rounded-full bg-accent ${busy ? "pulse-dot" : ""}`} />
          Ask about {g.name}
        </p>
        <p className="mt-1 text-[14px] text-ink-2">The agent answers with the parts of the guide you need, built for your question.</p>
      </div>

      <div className="flex flex-col gap-3 px-1.5" aria-live="polite">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="rise ml-auto max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-[15px] text-bg">
              {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
            </div>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              {(m.parts as Part[]).map((p, i) => (
                <Block key={p.toolCallId ?? i} p={p} Cite={Cite} onChoose={ask} busy={busy} />
              ))}
            </div>
          ),
        )}
        {status === "submitted" && <Skeleton />}
        {error && (
          <div className="rounded-xl bg-row px-4 py-3 text-[14px] text-ink-2">
            {error.message.includes("missing_key")
              ? "Asking needs ANTHROPIC_API_KEY on the server. Everything else on this page works without it."
              : `The agent hit an error: ${error.message.slice(0, 160)}`}
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-1 sm:px-5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)} className="label rounded-full bg-row/80 px-3 py-2 text-left !text-[11px] text-ink-2 hover:text-accent">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2 p-3 sm:p-4"
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          id="ask-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={300}
          placeholder={`e.g. Do I need a company to launch on ${g.name}?`}
          className="h-11 min-w-0 flex-1 bg-row px-4 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-ink-3 focus:ring-2 focus:ring-accent"
        />
        <button disabled={busy || !q.trim()} className="label h-11 shrink-0 bg-accent px-5 text-on-accent hover:opacity-90 disabled:opacity-40">
          Ask
        </button>
      </form>
    </section>
  );
}

function Block({ p, Cite, onChoose, busy }: { p: Part; Cite: CiteFn; onChoose: (t: string) => void; busy: boolean }) {
  const i = p.input ?? {};
  const card = "rise rounded-2xl bg-row px-4 py-3.5";
  const head = "label !text-[11px] text-ink-3";
  switch (p.type) {
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
              {i.handsOn} <span className="text-ink-3">your time</span> · {i.waiting} <span className="text-ink-3">waiting</span>
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
        <div className="rise flex flex-wrap gap-1.5 px-1">
          {opts.map((o) => (
            <button key={o} disabled={busy} onClick={() => onChoose(o)} className="label rounded-full bg-row px-3 py-2 text-left !text-[11px] text-accent hover:opacity-80 disabled:opacity-50">
              {o} →
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
