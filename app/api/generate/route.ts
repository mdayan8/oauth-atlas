import { convertToModelMessages, isStepCount, streamText, type UIMessage } from "ai";
import { makeTools, STEP_LIMIT, SYSTEM } from "@/lib/agent";
import { pickModel } from "@/lib/model";
import { fromThisSite } from "@/lib/guard";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!fromThisSite(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const m = pickModel({ effort: "medium" });
  if (!m) return Response.json({ error: "missing_key" }, { status: 503 });
  const { messages }: { messages: UIMessage[] } = await req.json();
  // One investigation per request: only the latest user message matters, capped in length.
  const last = messages.filter((m) => m.role === "user").at(-1);
  if (!last) return Response.json({ error: "no_input" }, { status: 400 });
  const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").slice(0, 200);

  const result = streamText({
    model: m.model,
    system: SYSTEM,
    messages: await convertToModelMessages([{ ...last, parts: [{ type: "text", text: `Investigate: ${text}` }] }]),
    tools: makeTools(m.webTools({ search: 6, fetch: 6 })),
    stopWhen: isStepCount(STEP_LIMIT),
    providerOptions: m.providerOptions,
  });

  // Provider errors (bad key, rate limit, overload) carry no secrets, so pass the message through.
  return result.toUIMessageStreamResponse({ onError: (e) => (e instanceof Error ? e.message : "Unknown error") + "." });
}
