"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";
import GuideView from "@/components/GuideView";
import AppSearch from "@/components/AppSearch";
import { fold } from "@/lib/fold";
import { pack } from "@/lib/pack";
import { STEP_LIMIT } from "@/lib/limits";

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
  const started = useRef("");

  useEffect(() => {
    if (!q || started.current === q) return;
    started.current = q;
    setMessages([]);
    sendMessage({ text: q });
  }, [q, sendMessage, setMessages]);

  const parts = messages.filter((m) => m.role === "assistant").flatMap((m) => m.parts as any[]);
  const { guide, log } = useMemo(() => fold(parts, q), [parts, q]);
  const steps = parts.filter((p) => p.type === "step-start").length;
  const running = status === "submitted" || status === "streaming";
  const missingKey = error?.message.includes("missing_key");
  const recent = log.slice(-6).reverse();

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="ice rounded-3xl p-5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="lg:w-[420px]">
              <p className="label flex items-center gap-2 text-accent">
                <span className={`h-2 w-2 rounded-full bg-accent ${running ? "pulse-dot" : ""}`} />
                {running ? "Agent is investigating" : error ? "Agent stopped" : steps ? "Investigation complete" : "Live agent"}
              </p>
              <p className="mt-3 text-[24px] leading-tight tracking-[-0.5px]">
                {q ? <>Building a guide for <span className="text-accent">{q}</span></> : "Generate a guide for any app"}
              </p>
              <p className="mt-2 text-[14px] text-ink-2">
                {running
                  ? `Step ${Math.max(steps, 1)} of up to ${STEP_LIMIT}. Cards appear as the agent finds evidence.`
                  : "It reads official docs, checks Composio, probes discovery endpoints, and cites everything."}
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
                  Set ANTHROPIC_API_KEY in the server environment to run it. The guide library works without one.
                </Notice>
              ) : error ? (
                <Notice title="The agent hit an error">{error.message.slice(0, 240)} Try again, or pick a library guide.</Notice>
              ) : (
                <ol className="flex flex-col gap-1.5" aria-live="polite">
                  {recent.length === 0 && (
                    <li className="label rounded-xl bg-row/70 px-4 py-3 text-ink-3">{q ? "Starting up..." : "Waiting for an app name"}</li>
                  )}
                  {recent.map((a, i) => (
                    <li
                      key={a.id + a.text}
                      className="rise flex items-center gap-3 rounded-xl bg-row/80 px-4 py-3 backdrop-blur"
                      style={{ opacity: 1 - i * 0.12 }}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.done ? "" : "pulse-dot"}`}
                        style={{ background: a.kind === "probe" ? "var(--b-tested)" : a.kind === "write" ? "var(--d-instant)" : "var(--ink-3)" }}
                      />
                      <span className="min-w-0 truncate font-mono text-[13px] text-ink-2">{a.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
      {q && !missingKey && <GuideView key={q} guide={guide} live={running} shareLink={async () => `${location.origin}/shared#${await pack(guide)}`} />}
    </>
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
