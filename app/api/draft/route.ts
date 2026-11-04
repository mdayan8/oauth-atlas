import { streamText } from "ai";
import { pickModel } from "@/lib/model";
import { fromThisSite } from "@/lib/guard";
import { getGuide } from "@/lib/guides";
import { Guide } from "@/lib/schema";

export const maxDuration = 120;

const SYSTEM = `You draft documents a developer needs to get an OAuth app approved by a provider: privacy policies, scope justifications, demo video scripts, app descriptions.
Output only the draft, in Markdown, ready to paste.
Use [square-bracket placeholders] for anything you do not know about the developer's company or product: name, URL, contact email, data retention period, region.
Never invent facts about the developer. Use only the provider requirements given in the context; if they name sections, wording or things a reviewer must see, cover each one.
If the task is code, write short working TypeScript (Node 20, fetch, no extra libraries) that reads the client id and secret from environment variables, with brief comments.
Keep it short and plain. No em dashes.`;

export async function POST(req: Request) {
  if (!fromThisSite(req, "draft")) return Response.json({ error: "forbidden" }, { status: 403 });
  const m = pickModel({ effort: "low", use: "draft" });
  if (!m) return Response.json({ error: "missing_key" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  // Library guides are looked up by slug; live guides send themselves (validated, size-capped).
  const raw = JSON.stringify(body.guide ?? "");
  const g = body.slug ? getGuide(String(body.slug)) : raw.length < 80_000 ? Guide.safeParse(body.guide).data : undefined;
  // Only things the guide says an agent can do: drafts among requirements, "agent" steps.
  const rq = g?.requirements.find((x) => x.id === body.requirementId && x.agentCanDraft);
  const step = g?.steps.find((x) => x.id === body.stepId && x.actor === "agent");
  const item = rq ? { id: rq.id, label: rq.label, detail: rq.detail } : step ? { id: step.id, label: step.title, detail: step.detail } : undefined;
  if (!g || !item) return Response.json({ error: "not_draftable" }, { status: 400 });
  // The developer's chosen path, so the draft matches it (send-only vs read scopes, testers vs real users).
  const situation = typeof body.situation === "string" ? body.situation.slice(0, 200) : "";

  const scopes: string[] = Array.isArray(body.scopes) ? body.scopes.slice(0, 20).map(String) : [];
  const scopeLines = g.scopes.filter((x) => scopes.includes(x.name)).map((x) => `- ${x.name}: ${x.meaning} (${x.tier})`);
  const context = [
    `Provider: ${g.name} (${g.domain})`,
    step ? `Do this step for the developer: ${item.label}` : `Draft this: ${item.label}`,
    step ? `What the step involves: ${item.detail}` : `What the provider requires: ${item.detail}`,
    scopeLines.length ? `Scopes the app will request:\n${scopeLines.join("\n")}` : "",
    `Other requirements for context:\n${g.requirements.filter((x) => x.id !== item.id).map((x) => `- ${x.label}: ${x.detail}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = streamText({
    model: m.model,
    system: situation ? `${SYSTEM}\n\nThe developer's situation: ${situation}. Draft for exactly that, nothing broader.` : SYSTEM,
    prompt: context,
    providerOptions: m.providerOptions,
  });
  return result.toTextStreamResponse();
}
