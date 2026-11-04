import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, isStepCount, streamText, type UIMessage } from "ai";
import { makeTools, STEP_LIMIT, SYSTEM, WRITE_SYSTEM } from "@/lib/agent";
import { gather } from "@/lib/gather";
import { linkAlive } from "@/lib/probes";
import { tidyGuide } from "@/lib/guards";
import { friendlyError, pickModel } from "@/lib/model";
import { fromThisSite } from "@/lib/guard";

export const maxDuration = 300;

type Chunk = Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"]["write"] extends (c: infer C) => void ? C : never;
// per-instance memory cache, lost on cold start; move to a KV store if many people share one deploy.
const cache = new Map<string, { at: number; chunks: Chunk[] }>();
const DAY = 24 * 60 * 60 * 1000;

// Provider errors (bad key, rate limit, overload) carry no secrets; rate limits get a plain message.
const onError = friendlyError;

export async function POST(req: Request) {
  if (!fromThisSite(req, "generate")) return Response.json({ error: "forbidden" }, { status: 403 });
  const m = pickModel({ effort: "medium" });
  if (!m) return Response.json({ error: "missing_key" }, { status: 503 });
  const { messages }: { messages: UIMessage[] } = await req.json();
  // One investigation per request: only the latest user message matters, capped in length.
  const last = messages.filter((m) => m.role === "user").at(-1);
  if (!last) return Response.json({ error: "no_input" }, { status: 400 });
  const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").slice(0, 200);

  if (!m.onePass) {
    const result = streamText({
      model: m.model,
      system: SYSTEM,
      messages: await convertToModelMessages([{ ...last, parts: [{ type: "text", text: `Investigate: ${text}` }] }]),
      tools: makeTools(m.webTools({ search: 4, fetch: 4 })),
      stopWhen: isStepCount(STEP_LIMIT),
      providerOptions: m.providerOptions,
    });
    return result.toUIMessageStreamResponse({ onError });
  }

  // Free models: gather real evidence in parallel, then one call writes the guide.
  const tools = { publish_guide: makeTools({}).publish_guide };
  const stream = createUIMessageStream({
    onError,
    execute: async ({ writer }) => {
      // Same app again within a day: replay the finished guide instantly and spend no quota.
      const key = text.toLowerCase().trim();
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < DAY) return hit.chunks.forEach((c) => writer.write(c));
      const chunks: Chunk[] = [];
      let published = false;
      const out = (c: Chunk) => {
        if (c.type === "tool-input-available" && c.toolName === "publish_guide") published = true;
        if (c.type !== "tool-input-delta") chunks.push(c);
        writer.write(c);
      };
      out({ type: "start" });
      out({ type: "start-step" });
      let n = 0;
      const show = (toolName: string, input: unknown, output: unknown) => {
        const toolCallId = `g${++n}`;
        out({ type: "tool-input-available", toolCallId, toolName, input });
        out({ type: "tool-output-available", toolCallId, output });
      };
      const { sources, evidence, mcp, composio } = await gather(text, async (toolName, input, run) => {
        const toolCallId = `g${++n}`;
        out({ type: "tool-input-available", toolCallId, toolName, input });
        const output = await run();
        // Raw page HTML stays on the server.
        const { raw: _raw, ...slim } = output ?? {};
        out({ type: "tool-output-available", toolCallId, output: slim });
        return output;
      });
      console.log(`generate: "${text}", ${sources.length} sources, ${evidence.length} chars of evidence`);
      // Nothing at all came back (no Composio toolkit, no docs, no live endpoint): this is not an app we can find.
      if (!composio && !sources.some((s) => s.badge === "official" || /\.well-known|\/authorize/.test(s.url))) {
        out({ type: "finish-step" });
        out({ type: "error", errorText: `We could not find an app called "${text}". Check the spelling, or paste its website address.` });
        return;
      }
      const officialUrl = sources.find((s) => s.badge === "official")?.url;
      const checked = new Date().toISOString().slice(0, 10);
      for (const s of sources) show("cite_source", s, { badge: s.badge, checked });
      out({ type: "finish-step" });

      // Groq writes in seconds but can hit a cap or reject a malformed call, which fails the whole reply, so a
      // fast attempt is held until it finishes cleanly. Order: the main model; if only its minute cap was hit,
      // wait that out on screen and retry; then the other Groq model (its own daily cap); then NIM, which is
      // slower and writes weaker guides, so it streams as it writes.
      const chain = [m, ...m.backups];
      let waited = false;
      const retried = new Set<number>();
      for (let i = 0; i < chain.length; i++) {
        const w = chain[i];
        const lastTry = i === chain.length - 1;
        let raw = "";
        const result = streamText({
          model: w.model,
          system: WRITE_SYSTEM,
          prompt: `App: ${text}\n\nEvidence:\n${evidence}`,
          tools,
          toolChoice: "required",
          stopWhen: isStepCount(1),
          // Groq counts prompt plus max output against its 8K a minute, so the output cap keeps us under it.
          maxOutputTokens: 3000,
          // Fail fast: waits are handled here and shown on screen.
          maxRetries: lastTry ? 2 : 0,
          providerOptions: w.providerOptions,
          onError: ({ error }) => void (raw = String(error)),
        });
        const held: Chunk[] = [];
        let failed = false;
        for await (const c of result.toUIMessageStream({ sendStart: false, onError })) {
          if (c.type === "tool-input-available" && c.toolName === "publish_guide") {
            const g = tidyGuide(c.input as Parameters<typeof tidyGuide>[0] & { links?: { url: string }[] }, evidence, officialUrl, text, { mcp, composio, officialPages: sources.filter((s) => s.badge === "official").length });
            // Every "Where to go" link is opened for real before it is shown.
            if (Array.isArray(g.links)) {
              const alive = await Promise.all(g.links.map((l) => linkAlive(l.url)));
              const dead = g.links.filter((_, i) => !alive[i]).map((l) => l.url);
              if (dead.length) console.warn(`generate: dropped dead links ${dead.join(", ")}`);
              g.links = g.links.filter((_, i) => alive[i]);
            }
          }
          if (lastTry) out(c);
          else if (c.type === "error" || c.type === "tool-input-error") failed = true;
          else held.push(c);
        }
        if (lastTry || !failed) {
          held.forEach(out);
          break;
        }
        console.warn(`generate: attempt ${i + 1} failed: ${raw.slice(0, 200)}`);
        // A malformed reply or a reply with no tool call is a fluke: one quick retry on the same model.
        if (!/rate limit/i.test(raw) && !retried.has(i)) {
          retried.add(i);
          i--;
          continue;
        }
        const [, min, sec] = raw.match(/try again in (?:(\d+)m)?([\d.]+)s/i) ?? [];
        const seconds = sec ? Number(min ?? 0) * 60 + Math.ceil(Number(sec)) : 0;
        if (!waited && w === m && /per minute|\((I|O)?TPM\)|\(RPM\)/i.test(raw) && seconds > 0 && seconds <= 65) {
          waited = true;
          const toolCallId = `wait${i}`;
          out({ type: "tool-input-available", toolCallId, toolName: "wait_quota", input: { seconds } });
          await new Promise((r) => setTimeout(r, seconds * 1000));
          out({ type: "tool-output-available", toolCallId, output: { ok: true } });
          i--;
        }
      }
      if (published && !chunks.some((c) => c.type === "error")) cache.set(key, { at: Date.now(), chunks });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
