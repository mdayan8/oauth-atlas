import { anthropic } from "@ai-sdk/anthropic";
import { createGroq, groq } from "@ai-sdk/groq";
import { tool, type LanguageModel, type streamText } from "ai";
import { z } from "zod";
import { cleanHtml, getText, safeOrigin, searchWeb } from "./probes";

type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]["providerOptions"]>;

// Claude when ANTHROPIC_API_KEY is set. Otherwise the free route: Groq (GROQ_API_KEY), with NVIDIA NIM
// (NVIDIA_API_KEY) as backup when Groq is missing or hits its limit. Keys only ever come from the environment.
// Groq rate limits are per model, so each feature gets its own free model and they never share a quota.
// Drafts are short and rare, so they share the Ask model. (Qwen was tried: it answers fast but drops fields and makes things up.)
export const GROQ_MODELS = { write: "openai/gpt-oss-120b", ask: "openai/gpt-oss-20b", draft: "openai/gpt-oss-20b" } as const;

export function pickModel(opts: { effort?: "low" | "medium"; use?: keyof typeof GROQ_MODELS } = {}) {
  if (process.env.ANTHROPIC_API_KEY)
    return {
      name: "claude-sonnet-5-5",
      model: anthropic("claude-sonnet-5-5") as LanguageModel,
      providerOptions: { anthropic: { effort: opts.effort ?? "medium", fallbacks: "default" } } as ProviderOptions,
      backups: [],
      // Claude is fast enough to run the full agent loop and search for itself.
      onePass: false,
      webTools: (uses: { search: number; fetch: number }) => ({
        web_search: anthropic.tools.webSearch_20260209({ maxUses: uses.search }),
        web_fetch: anthropic.tools.webFetch_20260209({ maxUses: uses.fetch }),
      }),
    };
  // Free tiers: Groq is fast but caps each free model at 8K tokens a minute.
  // NIM has no token cap but answers slowly. MiniMax was the only NIM model on the free account with correct tool calls.
  // ponytail: NIM speaks the same chat API, so the installed Groq client calls it; add a dedicated client if params drift.
  const nimKey = process.env.NVIDIA_API_KEY;
  const nim = nimKey ? { model: createGroq({ baseURL: "https://integrate.api.nvidia.com/v1", apiKey: nimKey })("minimaxai/minimax-m3.1-flash") as LanguageModel, providerOptions: {} as ProviderOptions } : null;
  const onGroq = (id: string) => ({ model: groq(id) as LanguageModel, providerOptions: { groq: { reasoningEffort: "low" } } as ProviderOptions });
  const id = GROQ_MODELS[opts.use ?? "write"];
  const fast = process.env.GROQ_API_KEY ? onGroq(id) : null;
  const first = fast ?? nim;
  if (!first) return null;
  // Each Groq model also has its own daily cap (200K tokens), so another Groq model is the next fastest backup.
  const other = fast && id !== GROQ_MODELS.ask ? onGroq(GROQ_MODELS.ask) : null;
  return {
    name: fast ? `${id} on Groq` : "minimax-m3.1-flash on NVIDIA NIM",
    ...first,
    backups: [other, fast ? nim : null].filter((b) => b !== null),
    onePass: true,
    // Our own keyless search and fetch: these providers have no built-in web tools that fit a streamed loop.
    webTools: (uses: { search: number; fetch: number }) => ({
      ...(uses.search > 0 ? { web_search: webSearch(uses.search) } : {}),
      web_fetch: fetchPage(uses.fetch),
    }),
  };
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
        // ponytail: first 4k characters only, to stay inside free-tier token limits; long docs lose their tail.
        return { url, status, text: cleanHtml(text).slice(0, 4000) };
      } catch (e) {
        return { url, error: String(e).slice(0, 120) };
      }
    },
  });
};

const webSearch = (budget: number) => {
  let used = 0;
  return tool({
    description: "Search the web. Returns titles and URLs; then web_fetch the official ones.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      if (++used > budget) return { query, error: "Search budget used up. Publish what you found now." };
      try {
        return { query, results: await searchWeb(query) };
      } catch (e) {
        return { query, error: String(e).slice(0, 120) };
      }
    },
  });
};

// Rate limits are the common failure on free tiers; say so plainly instead of dumping the provider's message.
export function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/rate limit|too many requests|429|tokens per (minute|day)/i.test(msg)) {
    const [, m, sec] = msg.match(/try again in (?:(\d+)m)?([\d.]+)s/i) ?? [];
    const wait = sec ? Number(m ?? 0) * 60 + Math.ceil(Number(sec)) : 0;
    if (/per day|\(TPD\)|\(RPD\)/i.test(msg)) return `The free AI used up today's limit. It frees up gradually: try again in ${wait ? Math.ceil(wait / 60) + " minutes" : "a while"}.`;
    return `The free AI is busy right now. Try again in ${wait ? wait + " seconds" : "about a minute"}.`;
  }
  if (/tool call validation failed|did not match schema/i.test(msg)) return "The free AI sent a broken answer. Please try again.";
  return msg.slice(0, 200) + ".";
}
