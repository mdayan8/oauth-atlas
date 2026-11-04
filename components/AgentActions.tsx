"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { Pill } from "./ui";

// The agent does an "Agent can draft" requirement or an "Agent can do" step for you, streamed in as it writes.
export function DraftButton({
  g,
  requirementId,
  stepId,
  scopes,
  label = "Draft it for me",
  situation,
}: {
  g: Guide;
  requirementId?: string;
  stepId?: string;
  scopes: string[];
  label?: string;
  situation?: string;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [copied, setCopied] = useState(false);

  async function run() {
    setState("writing");
    setText("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(g.generated ? { guide: g } : { slug: g.slug }), requirementId, stepId, scopes, situation }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setText(err.error === "missing_key" ? "Drafting needs an AI key on the server." : "The draft could not be written. Try again.");
        return setState("error");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + dec.decode(value, { stream: true }));
      }
      setState("done");
    } catch {
      setText("The connection dropped. Try again.");
      setState("error");
    }
  }

  if (state === "idle")
    return (
      <button onClick={run} className="label inline-flex h-9 items-center gap-2 rounded-[4px] bg-accent px-3.5 text-on-accent hover:opacity-90">
        <Sparkle /> {label}
      </button>
    );

  return (
    <div className="w-full rounded-lg bg-card p-3 ring-1 ring-[var(--accent-soft)]">
      <div className="flex items-center gap-2">
        <Pill color={state === "error" ? "var(--d-gated)" : "var(--accent)"}>
          {state === "writing" ? "Agent is writing" : state === "done" ? "Draft ready" : "Not drafted"}
        </Pill>
        {state === "writing" && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />}
        {state === "done" && (
          <button
            onClick={() =>
              navigator.clipboard.writeText(text).then(
                () => setCopied(true),
                () => {},
              )
            }
            className="label ml-auto text-accent hover:opacity-80"
          >
            {copied ? "Copied" : "Copy draft"}
          </button>
        )}
        {state !== "writing" && (
          <button onClick={run} className={`label text-ink-3 hover:text-ink ${state === "done" ? "" : "ml-auto"}`}>
            Redo
          </button>
        )}
      </div>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink-2">{text || " "}</pre>
      {state === "done" && <p className="mt-2 text-[12px] text-ink-3">Fill in the [bracketed] parts and have a person review it before you submit.</p>}
    </div>
  );
}

type Check = { label: string; url: string; ok: boolean; finding: string };

// Re-runs the guide's agent-tested claims against live endpoints, right now, in front of the reader.
export function Recheck({ slug }: { slug: string }) {
  const [items, setItems] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/recheck?slug=${encodeURIComponent(slug)}`);
      setItems((await res.json()).items);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  const good = items?.filter((x) => x.ok).length ?? 0;
  return (
    <div className="flex flex-col gap-2">
      <button onClick={run} disabled={busy} className="label inline-flex h-9 w-fit items-center gap-2 rounded-full bg-row px-3 text-ink hover:text-accent disabled:opacity-60">
        <span className={`h-1.5 w-1.5 rounded-full bg-[var(--b-tested)] ${busy ? "pulse-dot" : ""}`} />
        {busy ? "Re-checking live endpoints..." : items ? "Re-check again" : "Re-check live now"}
      </button>
      {failed && <p className="text-[13px] text-ink-3">Could not reach the check right now.</p>}
      {items && (
        <div className="rise rounded-xl bg-row p-3">
          <p className="text-[14px]">
            <span style={{ color: good === items.length ? "var(--d-instant)" : "var(--d-hard)" }}>
              {good} of {items.length} still true
            </span>{" "}
            <span className="text-ink-3">as of just now</span>
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {items.map((x) => (
              <li key={x.url + x.label} className="flex gap-2 text-[13px]">
                <span style={{ color: x.ok ? "var(--d-instant)" : "var(--d-gated)" }}>{x.ok ? "✓" : "✗"}</span>
                <span className="min-w-0">
                  <a href={x.url} target="_blank" rel="noreferrer" className="hover:text-accent">
                    {x.label}
                  </a>
                  <span className="block text-ink-3">{x.finding}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" />
    </svg>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        )
      }
      className="label inline-flex h-9 items-center bg-card px-3.5 text-ink hover:text-accent"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
