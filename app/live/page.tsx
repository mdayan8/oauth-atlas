"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import GuideView from "@/components/GuideView";
import AppSearch from "@/components/AppSearch";
import { fold, type Activity } from "@/lib/fold";
import { pack } from "@/lib/pack";

export default function LivePage() {
  return (
    <Suspense>
      <Live />
    </Suspense>
  );
}

function Live() {
  const q = useSearchParams().get("q")?.trim() ?? "";
  const router = useRouter();
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/generate" }),
  });
  // One run per query. No ref guard: dev strict mode stops the first run on remount, so the second must start.
  useEffect(() => {
    if (!q) return;
    setMessages([]);
    sendMessage({ text: q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const parts = messages.filter((m) => m.role === "assistant").flatMap((m) => m.parts as any[]);
  const { guide, log } = useMemo(() => fold(parts, q), [parts, q]);
  const running = status === "submitted" || status === "streaming";
  const missingKey = error?.message.includes("missing_key");
  const notFound = !!error?.message.startsWith("We could not find");
  // Elapsed time while running: a visible clock is calmer than a silent wait.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className={`${running || !guide.steps.length ? "ice rounded-3xl p-5 sm:p-8" : "rounded-3xl bg-card p-4 sm:p-5"} transition-[padding] duration-500`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="lg:w-[420px]">
              <p className="label flex items-center gap-2 text-accent">
                <span className={`h-2 w-2 rounded-full bg-accent ${running ? "pulse-dot" : ""}`} />
                {running
                  ? "Agent is investigating"
                  : missingKey
                    ? "Live agent needs a key"
                    : error
                      ? "Agent stopped"
                      : guide.steps.length
                        ? `Guide ready · ${guide.sources.length} sources · ${guide.steps.length} steps`
                        : "Live agent"}
              </p>
              <p className="mt-3 text-[24px] leading-tight tracking-[-0.5px]">
                {q ? <>Building a guide for <span className="text-accent">{q}</span></> : "Generate a guide for any app"}
              </p>
              <p className="mt-2 text-[14px] text-ink-2">
                {running
                  ? `${elapsed}s so far. Usually 10 seconds to 2 minutes: live checks first, then the guide is written from what was found.`
                  : "Searches the web, reads official docs, checks Composio, hits the provider's live endpoints, and cites every claim."}
              </p>
              <div className="mt-5">
                <AppSearch compact initial={q} onSubmit={(v) => router.push(`/live?q=${encodeURIComponent(v)}`)} />
              </div>
              {running && (
                <button onClick={stop} className="label mt-3 h-11 px-4 text-ink-2 hover:text-ink">
                  Stop
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {missingKey ? (
                <Notice title="The live agent needs an API key">
                  Set GROQ_API_KEY (free) or ANTHROPIC_API_KEY in the server environment to run it. The guide library works without one.
                </Notice>
              ) : notFound ? (
                <Notice title="No app found">{error!.message}</Notice>
              ) : error ? (
                <Notice title="The agent hit an error">{error.message.slice(0, 240)} Try again, or pick a library guide.</Notice>
              ) : (
                <Stages log={log} running={running} name={guide.name || q} sources={guide.sources.length} steps={guide.steps.length} started={!!q} />
              )}
            </div>
          </div>
        </div>
      </div>
      {q && !missingKey && !notFound && <GuideView key={q} guide={guide} live={running} shareLink={async () => `${location.origin}/shared#${await pack(guide)}`} />}
    </>
  );
}

// Four plain stages instead of a raw event list: anyone can see what the agent is doing and how far it got.
function Stages({ log, running, name, sources, steps, started }: { log: Activity[]; running: boolean; name: string; sources: number; steps: number; started: boolean }) {
  const of = (test: (a: Activity) => boolean) => log.filter(test);
  const groups = [
    { label: "Search the web", items: of((a) => a.text.startsWith("Searching")), unit: "search" },
    { label: "Read the official docs", items: of((a) => a.text.startsWith("Reading")), unit: "page" },
    { label: `Check ${name}'s live endpoints`, items: of((a) => a.kind === "probe"), unit: "check" },
    { label: "Write the guide", items: of((a) => a.kind === "write"), summary: steps ? `${steps} steps, ${sources} sources` : "" },
  ];
  // A stage is done once a later stage has started (or the run is over); the furthest started one is live.
  const furthest = groups.reduce((at, g, i) => (g.items.length ? i : at), -1);
  return (
    <ol className="flex flex-col gap-2" aria-live="polite">
      {groups.map((g, i) => {
        const state = !started ? "wait" : i < furthest || (!running && g.items.length) ? "done" : i === Math.max(furthest, 0) && running ? "live" : "wait";
        const last = g.items.filter((a, i, all) => i === 0 || a.text !== all[i - 1].text).slice(-2);
        return (
          <li key={g.label} className={`rounded-2xl px-4 py-3 transition-colors ${state === "live" ? "bg-card shadow-[0_8px_30px_-12px_rgba(0,7,205,0.35)]" : "bg-row/70"}`}>
            <div className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                  state === "done" ? "bg-accent text-on-accent" : state === "live" ? "border-2 border-accent text-accent" : "border border-line text-ink-3"
                }`}
              >
                {state === "done" ? "✓" : state === "live" ? <span className="pulse-dot h-2 w-2 rounded-full bg-accent" /> : i + 1}
              </span>
              <span className={`text-[15px] ${state === "wait" ? "text-ink-3" : "text-ink"}`}>{g.label}</span>
              <span className="label ml-auto text-ink-3">
                {g.summary || (g.items.length && "unit" in g ? `${g.items.length} ${g.unit}${g.items.length === 1 ? "" : g.unit === "search" ? "es" : "s"}` : "")}
              </span>
            </div>
            {state === "live" && last.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 pl-9">
                {last.map((a) => (
                  <li key={a.id + a.text} className="rise truncate font-mono text-[12px] text-ink-2">
                    {a.text}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-row px-5 py-4">
      <p className="text-[16px] font-medium">{title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}
