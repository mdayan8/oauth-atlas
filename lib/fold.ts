import type { Guide } from "./schema";

// Turn the agent's streamed tool calls into one Guide plus an activity log.
// Tool inputs may be partial while streaming, so every field gets a fallback.

type Part = { type: string; toolCallId?: string; state?: string; input?: any; output?: any };
export type Activity = { id: string; text: string; done: boolean; kind: "read" | "probe" | "write" };

const empty = (q: string): Guide => ({
  slug: "",
  name: q,
  domain: "",
  summary: "",
  needs: [],
  defaultNeeds: [],
  paths: [],
  links: [],
  verdicts: [],
  skip: { composioManaged: "unknown", mcpDcr: "unknown", note: "", whyOwnApp: [], sourceIds: [] },
  requirements: [],
  steps: [],
  scopes: [],
  limits: [],
  blockers: [],
  sources: [],
  unverified: [],
  checked: new Date().toISOString().slice(0, 10),
  generated: true,
});

const host = (u?: string) => {
  try {
    return u ? new URL(u).host + new URL(u).pathname.replace(/\/$/, "") : "";
  } catch {
    return u ?? "";
  }
};

export function fold(parts: Part[], query: string) {
  const g = empty(query);
  const log: Activity[] = [];
  const s = (x: unknown, d = "") => (typeof x === "string" ? x : d);
  const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? x.filter((v) => v != null) : []);
  const ids = (x: unknown) => arr<string>(x).filter((v) => typeof v === "string");

  for (const p of parts) {
    if (!p.type.startsWith("tool-")) continue;
    const name = p.type.slice(5);
    const i = p.input ?? {};
    const id = s(i.id) || p.toolCallId || String(log.length);
    const done = p.state === "output-available" || p.state === "output-error";
    const when = i.when && typeof i.when === "object" ? i.when : undefined;
    const sourced = { when, sourceIds: ids(i.sourceIds) };

    switch (name) {
      case "web_search":
        log.push({ id, kind: "read", done, text: `Searching "${s(i.query, "...")}"` });
        break;
      case "web_fetch":
        log.push({ id, kind: "read", done, text: `Reading ${host(i.url) || "page"}` });
        break;
      case "check_composio":
        log.push({ id, kind: "probe", done, text: `Checking Composio managed list for ${s(i.slug, "...")}` });
        break;
      case "try_authorize":
        log.push({ id, kind: "probe", done, text: `Trying the authorize step at ${host(i.authorizeUrl) || "..."}` });
        break;
      case "probe_oauth_metadata":
        log.push({ id, kind: "probe", done, text: `Probing ${host(i.origin) || "..."}/.well-known` });
        break;
      case "set_overview":
        g.name = s(i.name, g.name);
        g.domain = s(i.domain);
        g.portal = s(i.portal) || undefined;
        g.summary = s(i.summary);
        g.slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        g.needs = arr<any>(i.needs).filter((n) => n.id && n.label);
        g.defaultNeeds = ids(i.defaultNeeds);
        break;
      case "set_verdict": {
        if (!i.difficulty) break;
        const v = { difficulty: i.difficulty, handsOn: s(i.handsOn, "..."), waiting: s(i.waiting, "..."), why: s(i.why), ...sourced };
        // Same "when" replaces: this is how the meter moves when the agent learns more.
        const key = JSON.stringify(when ?? {});
        const at = g.verdicts.findIndex((x) => JSON.stringify(x.when ?? {}) === key);
        if (at >= 0) g.verdicts[at] = v;
        else g.verdicts.push(v);
        log.push({ id, kind: "write", done, text: `Verdict: ${i.difficulty}` });
        break;
      }
      case "set_skip_path":
        g.skip = {
          composioManaged: i.composioManaged ?? "unknown",
          mcpDcr: i.mcpDcr ?? "unknown",
          mcpServer: s(i.mcpServer) || undefined,
          note: s(i.note),
          whyOwnApp: ids(i.whyOwnApp),
          sourceIds: ids(i.sourceIds),
        };
        break;
      case "add_requirement":
        if (i.label) g.requirements.push({ id, label: s(i.label), detail: s(i.detail), agentCanDraft: !!i.agentCanDraft, ...sourced });
        break;
      case "add_step":
        if (i.title) g.steps.push({ id, title: s(i.title), detail: s(i.detail), actor: ["agent", "you", "provider"].includes(i.actor) ? i.actor : "you", duration: s(i.duration), ...sourced });
        break;
      case "add_scope":
        if (i.name) g.scopes.push({ name: s(i.name), meaning: s(i.meaning), tier: i.tier ?? "basic", triggersReview: !!i.triggersReview, ...sourced });
        break;
      case "add_limit":
        if (i.title) g.limits.push({ id, title: s(i.title), detail: s(i.detail), ...sourced });
        break;
      case "add_blocker":
        if (i.symptom) g.blockers.push({ id, symptom: s(i.symptom), fix: s(i.fix), ...sourced });
        break;
      case "cite_source":
        if (i.url && i.id) {
          // The server may downgrade an untested "tested" badge; trust its output once it arrives.
          const badge = p.output?.badge ?? i.badge ?? "unverified";
          g.sources.push({ id: s(i.id), title: s(i.title, i.url), url: s(i.url), badge, checked: p.output?.checked ?? g.checked, note: s(i.note) || undefined });
          log.push({ id, kind: "write", done, text: `Cited ${host(i.url)}` });
        }
        break;
      case "add_link":
        if (i.url && i.label) g.links.push({ kind: ["register", "console", "review", "docs", "support", "status"].includes(i.kind) ? i.kind : "docs", label: s(i.label), url: s(i.url), note: s(i.note) || undefined });
        break;
      case "add_path_option":
        if (i.label && i.set && typeof i.set === "object") g.paths.push({ id, label: s(i.label), detail: s(i.detail), set: i.set });
        break;
      case "flag_unverified":
        if (i.claim) g.unverified.push(s(i.claim));
        break;
    }
  }
  return { guide: g, log };
}
