import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, isStepCount, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { friendlyError, pickModel } from "@/lib/model";
import { fromThisSite } from "@/lib/guard";
import { getGuide } from "@/lib/guides";
import { AUDIENCES, Difficulty, Guide, PROFILES } from "@/lib/schema";

export const maxDuration = 120;

const SYSTEM = `You answer a developer's question about getting an OAuth app set up and approved, using the guide JSON below as your facts.
Answer ONLY with display tool calls, and make ALL of them together in this one reply (several calls in parallel). Each call renders a component on screen. No prose outside tools.
In that one reply, call:
- set_situation, if the developer said anything about their situation (individual, startup or company; just them and testers or real users; what their agent must do). Use need ids from the guide's "needs" list only. The guide on screen re-shapes to match.
- say: the direct answer in one or two plain sentences. If the guide has a harder verdict whose "when" matches what they described, lead with that verdict and its reason, and use show_warning for the thing that blocks them, in this same reply, never only as a follow-up choice. When their agent acts for other people (real users), some of those users will be in the harder situations the guide lists (an organization, a restricted scope): name the one that would bite them in a show_warning, even if they did not mention it.
- only the components that make the answer clearer: show_verdict when their situation changes how hard it is, show_compare for alternatives side by side, show_steps for what to do in order, show_warning for a real risk, show_links for where to go.
- offer_choices: two or three short follow-up questions they are likely to ask next.
Rules: use only facts in the guide or on an official page you fetched; pass sourceIds from the guide's sources where they support a claim. If the guide does not cover it, say so plainly. Never invent numbers, fees or review times. No em dashes. Keep every text short.`;

const ids = z.array(z.string()).default([]).describe("Guide source ids backing this");
const ok = async () => ({ ok: true });
const display = {
  set_situation: tool({
    description: "Re-shape the guide on screen to the developer's situation. Only include what they actually said.",
    inputSchema: z.object({
      profile: z.enum(PROFILES).nullish(),
      audience: z.enum(AUDIENCES).nullish().describe("few = just them and testers, many = real users"),
      needs: z.array(z.string()).nullish().describe("Need ids from the guide"),
      summary: z.string().nullish().describe("Short, e.g. 'Startup, real users, read email'"),
    }),
    execute: ok,
  }),
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

// The same components as fields of one call, for free models that make one tool call per reply.
// The Ask panel splits it back into the components above, in this order.
const schema = (k: keyof typeof display) => display[k].inputSchema as unknown as z.ZodType;
const answer = tool({
  description: "Answer with these components, in order. Set the ones that do not help to null.",
  inputSchema: z.object({
    set_situation: schema("set_situation").nullish().describe("null unless the message describes who they are, who their users are, or what their agent must do"),
    // Everything is nullable: Groq rejects the whole reply when a required field comes back null.
    say: schema("say").nullish().describe("Always: the direct answer"),
    show_verdict: schema("show_verdict").nullish(),
    show_compare: schema("show_compare").nullish(),
    show_steps: schema("show_steps").nullish(),
    show_warning: schema("show_warning").nullish(),
    show_links: schema("show_links").nullish(),
    offer_choices: schema("offer_choices").nullish().describe("Always: follow-up questions"),
  }),
  execute: ok,
});

// The guide without empty fields or page notes: about a fifth smaller, which keeps free models under their cap.
const compact = (g: unknown) =>
  JSON.stringify(g, (k, v) => (k === "note" || k === "checked" || k === "paths" || v === null || v === "" || (Array.isArray(v) && !v.length) ? undefined : v));

export async function POST(req: Request) {
  if (!fromThisSite(req, "ask")) return Response.json({ error: "forbidden" }, { status: 403 });
  const m = pickModel({ effort: "low", use: "ask" });
  if (!m) return Response.json({ error: "missing_key" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const raw = JSON.stringify(body.guide ?? "");
  const g = body.slug ? getGuide(String(body.slug)) : raw.length < 80_000 ? Guide.safeParse(body.guide).data : undefined;
  if (!g) return Response.json({ error: "unknown_guide" }, { status: 400 });
  // Keep the conversation small: last 8 messages.
  const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages.slice(-8) : [];

  // Free models flake now and then (a reply with no tool call, or a broken one). Each attempt is held until it
  // finishes cleanly: the main model twice, then the backup, which streams as it writes.
  // The harder situations are the facts a small model drops most, so they are spelled out above the JSON.
  const harder = g.verdicts.filter((v) => v.when).length
    ? `Harder situations this guide lists. If one could apply to this developer or some of their users, show_warning it:\n${g.verdicts
        .filter((v) => v.when)
        .map((v) => `- ${v.difficulty} when ${JSON.stringify(v.when)}: ${v.why}`)
        .join("\n")}\n\n`
    : "";
  const chain = [m, m, ...m.backups];
  const stream = createUIMessageStream({
    onError: friendlyError,
    execute: async ({ writer }) => {
      for (const [i, w] of chain.entries()) {
        const lastTry = i === chain.length - 1;
        const result = streamText({
          model: w.model,
          system: `${SYSTEM}${m.onePass ? "\nYou have one tool, answer: put each component above in its field of the same name, null for the ones you skip." : ""}\n\n${harder}Guide JSON:\n${compact(g)}`,
          messages: await convertToModelMessages(messages),
          // Free models answer in one call: a second step would resend the guide and blow Groq's per-minute cap.
          // Claude can afford separate calls and reading an official page first.
          tools: m.onePass ? { answer } : { ...display, web_fetch: m.webTools({ search: 1, fetch: 2 }).web_fetch },
          stopWhen: isStepCount(m.onePass ? 1 : 6),
          toolChoice: m.onePass ? "required" : "auto",
          maxRetries: lastTry ? 2 : 0,
          providerOptions: w.providerOptions,
        });
        const held: Parameters<typeof writer.write>[0][] = [];
        let failed = false;
        for await (const c of result.toUIMessageStream({ onError: friendlyError })) {
          if (lastTry) writer.write(c);
          else if (c.type === "error" || c.type === "tool-input-error") failed = true;
          else held.push(c);
        }
        if (lastTry || !failed) {
          held.forEach((c) => writer.write(c));
          return;
        }
        console.warn(`ask: attempt ${i + 1} failed, trying ${chain[i + 1] === m ? "again" : "backup"}`);
      }
    },
  });
  return createUIMessageStreamResponse({ stream });
}
