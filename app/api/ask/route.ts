import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, isStepCount, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { MODEL } from "@/lib/agent";
import { fromThisSite } from "@/lib/guard";
import { getGuide } from "@/lib/guides";
import { Difficulty, Guide } from "@/lib/schema";

export const maxDuration = 120;

const SYSTEM = `You answer a developer's question about getting an OAuth app set up and approved, using the guide JSON below as your facts.
Answer ONLY by calling display tools; each call renders a component on screen. Do not write prose outside tools.
1. Start with say: the direct answer in one or two plain sentences.
2. Then add only the components that make the answer clearer: show_verdict when their situation changes how hard it is, show_compare for alternatives side by side, show_steps for what to do in order, show_warning for a real risk, show_links for where to go.
3. End with offer_choices: two or three short follow-up questions they are likely to ask next.
Rules: use only facts in the guide or on an official page you fetched; pass sourceIds from the guide's sources where they support a claim. If the guide does not cover it, say so plainly. Never invent numbers, fees or review times. No em dashes. Keep every text short.`;

const ids = z.array(z.string()).default([]).describe("Guide source ids backing this");
const ok = async () => ({ ok: true });
const display = {
  say: tool({ description: "The direct answer, one or two sentences.", inputSchema: z.object({ text: z.string(), sourceIds: ids }), execute: ok }),
  show_verdict: tool({
    description: "How hard it is for the situation they described.",
    inputSchema: z.object({ situation: z.string(), difficulty: Difficulty, handsOn: z.string(), waiting: z.string(), why: z.string(), sourceIds: ids }),
    execute: ok,
  }),
  show_compare: tool({
    description: "Options side by side.",
    inputSchema: z.object({
      title: z.string(),
      columns: z.array(z.string()).describe("Option names"),
      rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })),
    }),
    execute: ok,
  }),
  show_steps: tool({
    description: "What to do, in order.",
    inputSchema: z.object({
      title: z.string(),
      steps: z.array(z.object({ title: z.string(), actor: z.enum(["agent", "you", "provider"]), duration: z.string().optional() })),
      sourceIds: ids,
    }),
    execute: ok,
  }),
  show_warning: tool({ description: "A real risk or irreversible choice.", inputSchema: z.object({ title: z.string(), detail: z.string(), sourceIds: ids }), execute: ok }),
  show_links: tool({
    description: "Official pages to open.",
    inputSchema: z.object({ links: z.array(z.object({ label: z.string(), url: z.string() })) }),
    execute: ok,
  }),
  offer_choices: tool({
    description: "Two or three follow-up questions the developer can tap.",
    inputSchema: z.object({ options: z.array(z.string()).max(3) }),
    execute: ok,
  }),
};

export type AskTools = typeof display;

export async function POST(req: Request) {
  if (!fromThisSite(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "missing_key" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const raw = JSON.stringify(body.guide ?? "");
  const g = body.slug ? getGuide(String(body.slug)) : raw.length < 80_000 ? Guide.safeParse(body.guide).data : undefined;
  if (!g) return Response.json({ error: "unknown_guide" }, { status: 400 });
  // Keep the conversation small: last 8 messages.
  const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages.slice(-8) : [];

  const result = streamText({
    model: anthropic(MODEL),
    system: `${SYSTEM}\n\nGuide JSON:\n${JSON.stringify(g)}`,
    messages: await convertToModelMessages(messages),
    tools: { ...display, web_fetch: anthropic.tools.webFetch_20260209({ maxUses: 2 }) },
    stopWhen: isStepCount(6),
    providerOptions: { anthropic: { effort: "low", fallbacks: "default" } },
  });
  return result.toUIMessageStreamResponse({ onError: (e) => (e instanceof Error ? e.message : "Unknown error") + "." });
}
