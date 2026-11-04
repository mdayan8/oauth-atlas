import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { tool, type streamText } from "ai";
import { z } from "zod";
import { getText, safeOrigin } from "./probes";

type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]["providerOptions"]>;

// Claude when ANTHROPIC_API_KEY is set, otherwise Groq (GROQ_API_KEY). Keys only ever come from the environment.
export function pickModel(opts: { effort?: "low" | "medium" } = {}) {
  if (process.env.ANTHROPIC_API_KEY)
    return {
      name: "claude-sonnet-5-5",
      model: anthropic("claude-sonnet-5-5"),
      providerOptions: { anthropic: { effort: opts.effort ?? "medium", fallbacks: "default" } } as ProviderOptions,
      webTools: (uses: { search: number; fetch: number }) => ({
        web_search: anthropic.tools.webSearch_20260209({ maxUses: uses.search }),
        web_fetch: anthropic.tools.webFetch_20260209({ maxUses: uses.fetch }),
      }),
    };
  if (process.env.GROQ_API_KEY)
    return {
      name: "openai/gpt-oss-120b on Groq",
      model: groq("openai/gpt-oss-120b"),
      providerOptions: { groq: { reasoningEffort: "low" } } as ProviderOptions,
      // Groq's built-in browsing runs its own loop and ends the turn, so search and fetch are our own keyless tools.
      webTools: (uses: { search: number; fetch: number }) => ({
        ...(uses.search > 0 ? { web_search: webSearch(uses.search) } : {}),
        web_fetch: fetchPage(uses.fetch),
      }),
    };
  return null;
}

// A page reader with a per-request budget, so a model that guesses URLs can't spend every step fetching.
const fetchPage = (budget: number) => {
  let used = 0;
  return tool({
  description: "Read a public web page (official docs preferred) and return its text. Use URLs you found by searching; do not guess.",
  inputSchema: z.object({ url: z.string() }),
  execute: async ({ url }) => {
    if (++used > budget) return { url, error: "Page budget used up. Publish what you found now with the UI tools and flag the rest as unverified." };
    if (!safeOrigin(url)) return { url, error: "Only public https URLs can be read." };
    try {
      const { status, text } = await getText(url);
      const clean = text
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // ponytail: first 6k characters only, to stay inside free-tier token limits; long docs lose their tail.
      return { url, status, text: clean.slice(0, 6000) };
    } catch (e) {
      return { url, error: String(e).slice(0, 120) };
    }
  },
  });
};

// ponytail: scrapes DuckDuckGo's HTML results page; swap for a search API if it starts failing.
const webSearch = (budget: number) => {
  let used = 0;
  return tool({
    description: "Search the web. Returns titles and URLs; then web_fetch the official ones.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      if (++used > budget) return { query, error: "Search budget used up. Publish what you found now." };
      try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          signal: AbortSignal.timeout(8000),
          headers: { "user-agent": "Mozilla/5.0 (Macintosh) OAuthAtlas/1.0" },
        });
        const html = await res.text();
        const results = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].slice(0, 6).map((m) => {
          const real = m[1].match(/uddg=([^&]+)/);
          return { url: real ? decodeURIComponent(real[1]) : m[1], title: m[2].replace(/<[^>]+>/g, "").trim() };
        });
        return { query, results };
      } catch (e) {
        return { query, error: String(e).slice(0, 120) };
      }
    },
  });
};
