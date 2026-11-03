import { anthropic } from "@ai-sdk/anthropic";
import { tool } from "ai";
import { z } from "zod";
import { readComposio, readMetadata, safeOrigin } from "./probes";
import { Blocker, Limit, Need, Requirement, Scope, SkipPath, Source, Step, Verdict } from "./schema";

export const MODEL = "claude-sonnet-5-5";
import { STEP_LIMIT } from "./limits";
export { STEP_LIMIT };

export const SYSTEM = `You investigate what it takes for a developer to register and get approval for an OAuth app with one provider, so their AI agent's users can click "Connect <App>". You publish findings by calling UI tools; each call renders a card on the developer's screen immediately. There is no chat: do not write prose replies, only tool calls.

Work in this order, using parallel tool calls whenever calls do not depend on each other:
1. set_overview (name, official domain, developer portal, one-line summary, 2 to 4 "needs" the developer's agent might have, such as read vs write, with short ids).
2. check_composio with the Composio toolkit slug (lowercase app name, no spaces) and probe_oauth_metadata on the provider's auth origin and, if one exists, its hosted MCP server origin. Then set_skip_path.
3. web_search, then web_fetch the provider's OWN docs: app registration, scopes, app review or verification, quotas and user caps in development mode, distribution or marketplace rules.
4. As you learn, call cite_source BEFORE any claim that uses it, then add_requirement, add_step, add_scope, add_limit, add_blocker with sourceIds. Call set_verdict as soon as you have a first read and call it again (same "when") to correct it; add harder verdicts with a "when" for situations that are harder (e.g. a restricted scope, a public launch, an individual developer).
5. flag_unverified for anything important you could not confirm.

Rules:
- Never invent numbers, fees or review times. If no source states it, say "Not published" or flag it as unverified.
- Prefer official provider pages (badge "official"). Blogs and forums are "third_party". Only use badge "tested" for a probe result you saw in this run.
- "when" makes an item apply only to some readers: profile (individual, startup, company), audience (few = just them and testers, many = real users), needs (ids from set_overview). Leave it out when an item applies to everyone.
- Step actors: "agent" = an AI coding agent can do it without logging in (read docs, draft the privacy policy or scope justification, write the OAuth code); "you" = a human must (create accounts, click in consoles, verify a business, pay, record a demo video); "provider" = waiting on review.
- Plain, short sentences. No em dashes. One or two sentences per detail.
- You have about ${STEP_LIMIT} steps. Publish early and keep publishing. Finish with a verdict, at least 4 steps, the key scopes and limits, and every source you used.`;

const ok = (extra: Record<string, unknown> = {}) => ({ ok: true, ...extra });
const unsourced = (ids?: string[]) =>
  ids?.length ? ok() : ok({ warning: "No sourceIds: this shows as Unverified. Cite a source to upgrade it." });

export function makeTools() {
  // URLs our own probes actually fetched in this run. "tested" badges must point at one of these.
  const probed = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  return {
    set_overview: tool({
      description: "Name the app and list the 2 to 4 things the developer's agent might need to do.",
      inputSchema: z.object({
        name: z.string(),
        domain: z.string(),
        portal: z.string().optional().describe("Developer portal URL"),
        summary: z.string().describe("One sentence: what getting an OAuth app here involves"),
        needs: z.array(Need),
        defaultNeeds: z.array(z.string()).describe("Most common pick, ids from needs"),
      }),
      execute: async () => ok(),
    }),
    set_verdict: tool({
      description: "Set or update a verdict. Calling again with the same `when` replaces it.",
      inputSchema: Verdict,
      execute: async (v) => unsourced(v.sourceIds),
    }),
    set_skip_path: tool({ description: "Can the developer skip registering their own app?", inputSchema: SkipPath, execute: async () => ok() }),
    add_requirement: tool({ description: "Something the developer must have or prepare.", inputSchema: Requirement, execute: async (x) => unsourced(x.sourceIds) }),
    add_step: tool({ description: "One step in order, tagged with who does it.", inputSchema: Step, execute: async (x) => unsourced(x.sourceIds) }),
    add_scope: tool({ description: "One permission scope and whether it triggers review.", inputSchema: Scope, execute: async (x) => unsourced(x.sourceIds) }),
    add_limit: tool({ description: "A cap, quota, expiry or irreversible choice.", inputSchema: Limit, execute: async (x) => unsourced(x.sourceIds) }),
    add_blocker: tool({ description: "A known blocker and how to get past it.", inputSchema: Blocker, execute: async (x) => unsourced(x.sourceIds) }),
    cite_source: tool({
      description: "Register a source before claims reference its id.",
      inputSchema: Source.omit({ checked: true }),
      execute: async (src) => {
        const origin = safeOrigin(src.url);
        const wasProbed = [...probed].some((p) => src.url.startsWith(p));
        // Downgrade a "tested" claim the agent did not actually test in this run.
        const badge = src.badge === "tested" && !wasProbed ? "unverified" : src.badge;
        return ok({ badge, checked: today, downgraded: badge !== src.badge, valid: !!origin });
      },
    }),
    flag_unverified: tool({
      description: "Something important you could not confirm.",
      inputSchema: z.object({ claim: z.string() }),
      execute: async () => ok(),
    }),
    check_composio: tool({
      description: "Check Composio's toolkit docs for whether Composio-managed OAuth exists for this app.",
      inputSchema: z.object({ slug: z.string().describe("e.g. 'github', 'googlecalendar'") }),
      execute: async ({ slug }) => {
        const r = await readComposio(slug);
        probed.add(r.url);
        return r;
      },
    }),
    probe_oauth_metadata: tool({
      description:
        "Fetch an origin's OAuth discovery documents (openid-configuration, oauth-authorization-server, oauth-protected-resource). Use on the provider's auth origin and on its MCP server origin to detect dynamic client registration.",
      inputSchema: z.object({ origin: z.string().describe("e.g. https://accounts.google.com or https://mcp.notion.com") }),
      execute: async ({ origin }) => {
        const o = safeOrigin(origin);
        if (!o) return { error: "Only public https origins can be probed." };
        const paths = ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server", "/.well-known/oauth-protected-resource"];
        const results = await Promise.all(paths.map((p) => readMetadata(o + p)));
        results.forEach((x) => probed.add(x.url));
        return { origin: o, results };
      },
    }),
    web_search: anthropic.tools.webSearch_20260209({ maxUses: 6 }),
    web_fetch: anthropic.tools.webFetch_20260209({ maxUses: 10 }),
  };
}

export type AgentTools = ReturnType<typeof makeTools>;
