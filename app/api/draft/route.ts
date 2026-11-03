import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { MODEL } from "@/lib/agent";
import { fromThisSite } from "@/lib/guard";
import { getGuide } from "@/lib/guides";
import { Guide } from "@/lib/schema";

export const maxDuration = 120;

const SYSTEM = `You draft documents a developer needs to get an OAuth app approved by a provider: privacy policies, scope justifications, demo video scripts, app descriptions.
Output only the draft, in Markdown, ready to paste.
Use [square-bracket placeholders] for anything you do not know about the developer's company or product: name, URL, contact email, data retention period, region.
Never invent facts about the developer. Use only the provider requirements given in the context; if they name sections, wording or things a reviewer must see, cover each one.
Keep it short and plain. No em dashes.`;

export async function POST(req: Request) {
  if (!fromThisSite(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "missing_key" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  // Library guides are looked up by slug; live guides send themselves (validated, size-capped).
  const raw = JSON.stringify(body.guide ?? "");
  const g = body.slug ? getGuide(String(body.slug)) : raw.length < 80_000 ? Guide.safeParse(body.guide).data : undefined;
  const item = g?.requirements.find((x) => x.id === body.requirementId && x.agentCanDraft);
  if (!g || !item) return Response.json({ error: "not_draftable" }, { status: 400 });

  const scopes: string[] = Array.isArray(body.scopes) ? body.scopes.slice(0, 20).map(String) : [];
  const scopeLines = g.scopes.filter((x) => scopes.includes(x.name)).map((x) => `- ${x.name}: ${x.meaning} (${x.tier})`);
  const context = [
    `Provider: ${g.name} (${g.domain})`,
    `Draft this: ${item.label}`,
    `What the provider requires: ${item.detail}`,
    scopeLines.length ? `Scopes the app will request:\n${scopeLines.join("\n")}` : "",
    `Other requirements for context:\n${g.requirements.filter((x) => x.id !== item.id).map((x) => `- ${x.label}: ${x.detail}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = streamText({
    model: anthropic(MODEL),
    system: SYSTEM,
    prompt: context,
    providerOptions: { anthropic: { effort: "low", fallbacks: "default" } },
  });
  return result.toTextStreamResponse();
}
