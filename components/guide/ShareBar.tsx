"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import type { Resolved, Situation } from "@/lib/situation";
import { toAgentPrompt, toMarkdown } from "@/lib/share";

export default function ShareBar({ g, r, s, shareLink }: { g: Guide; r: Resolved; s: Situation; shareLink?: () => Promise<string> }) {
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
