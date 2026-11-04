"use client";

import { useEffect, useState } from "react";
import type { Guide } from "@/lib/schema";
import type { Resolved, Situation } from "@/lib/situation";
import { ACTOR_LABEL, situationLine } from "@/lib/share";
import { CopyButton, DraftButton } from "../AgentActions";
import { EvidenceBadge, Skeleton } from "../ui";
import { LinkButton, linkFor, stepPrompt } from "./links";
import { ACTOR_COLOR, plural, type CiteFn } from "./shared";

// From Composio's "Using your own OAuth apps" docs (checked 2026-11-04). Guides exist for these slugs at composio.dev/auth/<slug>.
const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";
const COMPOSIO_GUIDES = new Set(["github", "notion", "slack", "shopify", "linear"]);

// One path from start to approved, as a vertical timeline: get the requirements ready, then each step.
// Only the next step is open, with a clear "Mark done". Progress is kept per guide in this browser.
export default function Path({ g, r, sit, live, Cite }: { g: Guide; r: Resolved; sit: Situation; live: boolean; Cite: CiteFn }) {
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
                  {x.agentCanDraft && <span className="label shrink-0 whitespace-nowrap text-accent">Agent can draft</span>}
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
                  {/* Where to get it: the sign-up page for an account, the console for an app or redirect URL, the scopes page for scopes. */}
                  {(() => {
                    const l = linkFor(g, `${x.label} ${x.detail}`, "you");
                    return l ? (
                      <div className="mt-2.5">
                        <LinkButton l={{ ...l, label: `${/account|organization|organisation|workspace|partner|tenant/i.test(x.label) ? "Create it" : "Open"}: ${l.label}` }} main={!x.agentCanDraft} />
                      </div>
                    ) : null;
                  })()}
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
            Wait: <span className="text-ink">{x.duration || "not published"}</span>. Reply fast if the reviewer emails.
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
    <section id="path" className="scroll-mt-24 rounded-xl border border-line bg-bg p-2">
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
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(doneCount / items.length) * 100}%`, background: "var(--accent)" }} />
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
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => toggle(x.id)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `Mark "${x.title}" not done` : `Mark "${x.title}" done`}
                    className="label grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all"
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
                        <span className="label" style={{ color: x.actor === "you" ? "var(--ink-2)" : c }}>
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
            Done. Users can connect {g.name}.
          </p>
        )}
      </div>
    </section>
  );
}

function MarkDone({ done, onClick, label = "Mark done" }: { done: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="label inline-flex h-9 items-center gap-1.5 bg-card px-3.5 text-ink transition-colors hover:text-[var(--d-instant)]"
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
