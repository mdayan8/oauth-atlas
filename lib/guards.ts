// Rules the writer model must follow, enforced in code on its output before anything reaches the screen.

// "Never invent review times": a waiting time is kept only if the evidence states that number with that unit.
export function sourcedWait(waiting: string, evidence: string) {
  const unit = waiting.match(/minute|hour|day|week|month/i)?.[0];
  const nums = waiting.match(/\d+/g);
  if (!nums || !unit) return waiting;
  const stated = nums.every((n) => new RegExp(`\\b${n}\\b[^.]{0,24}${unit}`, "i").test(evidence));
  return stated ? waiting : "Not published";
}

type When = { profile?: unknown[] | null; audience?: unknown[] | null; needs?: string[] | null } | null;
type Draft = {
  overview?: { name?: string; domain?: string | null; needs?: { id: string }[]; summary?: string } | null;
  skip?: { mcpServer?: string | null; mcpDcr?: string; composioManaged?: string } | null;
  verdicts?: { difficulty?: string; waiting: string; when?: When }[] | null;
  unverified?: string[] | null;
  [list: string]: unknown;
};

const empty = (w: When) => !w || (!w.profile?.length && !w.audience?.length && !w.needs?.length);

type Found = {
  mcp?: { server: string; dcr: boolean };
  composio?: { managed: string; auth?: string; slug?: string };
  officialPages?: number;
};

// A citation is kept only when the cited evidence actually contains the claim: a scope name verbatim; for a
// limit or requirement, one of its numbers or at least two of its longer words. Otherwise the item stays but
// shows as Unverified, so a confident-looking badge can never cover something the model made up.
const STOP = new Set(["should", "before", "their", "which", "users", "application", "request", "requests", "tokens", "access", "cannot", "without", "require", "requires", "required", "between", "account", "accounts", "through", "integration", "developer", "developers"]);
export function supported(text: string, evidence: string) {
  const hay = evidence.toLowerCase();
  if ((text.match(/\d+/g) ?? []).some((n) => new RegExp(`\\b${n}\\b`).test(evidence))) return true;
  const words = [...new Set((text.toLowerCase().match(/[a-z][a-z_:.-]{5,}/g) ?? []).filter((w) => !STOP.has(w)))];
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits >= 2 || (words.length > 0 && hits / words.length >= 0.5);
}

// Sentences that describe our own endpoint check, which must never read as advice or a blocker.
const PROBE = /made[- ]up|probe|authorize attempt|attempt(ed)? (the |an )?authoriz|without a registered (app|client)|does not identify a registered|no registered (app|client)|unregistered (app|client)|not a snowflake|returned http \d{3}/i;
export const scrub = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .filter((x) => !PROBE.test(x))
    .join(" ")
    .trim();

export function tidyGuide<T extends Draft>(g: T, evidence: string, officialUrl?: string, app = "", found: Found = {}): T {
  {
    const d = g as Draft & { overview?: { summary?: string } | null; skip?: { note?: string } | null; unverified?: string[] | null };
    if (d.overview?.summary) d.overview.summary = scrub(d.overview.summary) || d.overview.summary;
    if (d.skip?.note) d.skip.note = scrub(d.skip.note);
    d.verdicts?.forEach((v) => ((v as { why?: string }).why = scrub((v as { why?: string }).why ?? "")));
    (d.steps as { detail?: string }[] | undefined)?.forEach((x) => (x.detail = scrub(x.detail ?? "")));
    if (Array.isArray(d.unverified)) d.unverified = d.unverified.filter((x) => !PROBE.test(x));
    if (Array.isArray(d.blockers)) d.blockers = (d.blockers as { symptom?: string; fix?: string }[]).filter((b) => !PROBE.test(`${b.symptom ?? ""} ${b.fix ?? ""}`));
    // A verdict about Composio's managed app belongs in the skip section, not among own-app verdicts.
    if (d.verdicts && d.verdicts.length > 1) d.verdicts = d.verdicts.filter((v) => !/composio/i.test((v as { why?: string }).why ?? ""));
    // The same page listed twice helps no one.
    const seen = new Set<string>();
    if (Array.isArray(d["links"])) d["links"] = (d["links"] as { url: string }[]).filter((l) => !seen.has(l.url) && seen.add(l.url));
  }
  {
    const d = g as Draft;
    const hay = evidence.toLowerCase();
    // A scope name or a cap the evidence does not contain is the model's memory: it goes, rather than
    // standing there with an Unverified badge. Requirements are generic enough to keep, unbadged.
    if (Array.isArray(d.scopes)) d.scopes = (d.scopes as { name: string }[]).filter((x) => /^[\w.:/-]+$/.test(x.name) && hay.includes(x.name.toLowerCase()));
    if (Array.isArray(d.limits)) d.limits = (d.limits as { title?: string; detail?: string }[]).filter((x) => supported(`${x.title ?? ""} ${x.detail ?? ""}`, evidence));
    (d.requirements as { label?: string; detail?: string; sourceIds?: string[] }[] | undefined)?.forEach((x) => {
      if (!supported(`${x.label ?? ""} ${x.detail ?? ""}`, evidence)) x.sourceIds = [];
    });
    // Clicking in a console, dashboard or portal needs a login the agent does not have.
    (d.steps as { title?: string; actor?: string }[] | undefined)?.forEach((x) => {
      if (x.actor === "agent" && /^(configure|set|add|register|create|enable|paste|open)\b.*\b(redirect|callback|console|dashboard|portal|settings)\b/i.test(x.title ?? "")) x.actor = "you";
    });
    // One card per situation, and Composio's managed app is the skip card, not a path.
    if (Array.isArray(d["paths"])) {
      const seen = new Set<string>();
      d["paths"] = (d["paths"] as { label?: string; set?: unknown }[]).filter((p) => {
        const key = JSON.stringify(p.set ?? {});
        if (seen.has(key) || /composio|managed connection|managed app/i.test(p.label ?? "")) return false;
        seen.add(key);
        return true;
      });
    }
    // Dynamic client registration is a POST an agent makes; it is never a human step.
    (d.steps as { title?: string; detail?: string; actor?: string }[] | undefined)?.forEach((x) => {
      if (/dynamic client registration|registration endpoint|\/register\b/i.test(`${x.title ?? ""} ${x.detail ?? ""}`)) x.actor = "agent";
    });
  }
  // What the probes saw beats what the model wrote: the skip section is the headline and it must be right.
  if (g.skip) {
    if (found.mcp) {
      g.skip.mcpServer = found.mcp.server;
      g.skip.mcpDcr = found.mcp.dcr ? "yes" : "no";
    }
    if (found.composio?.managed === "yes" || found.composio?.managed === "no") g.skip.composioManaged = found.composio.managed;
    if (found.composio?.slug) (g.skip as { composioSlug?: string }).composioSlug = found.composio.slug;
  }
  // No official page could be read (search blocked, no docs link): say so instead of showing an empty guide.
  if (found.officialPages === 0) {
    const d0 = g as Draft;
    const note = "No official documentation page could be read in this run, so only Composio's status and live endpoint checks are shown. Open the provider's developer docs for the steps.";
    d0.unverified = [note, ...((d0.unverified as string[] | undefined) ?? [])];
    // Scope names and caps only come from docs; without any, they would be the model's memory.
    d0.scopes = [];
    d0.limits = [];
  }
  // The authorize attempt is evidence of the flow, not something the developer will hit.
  const d = g as Draft;
  if (Array.isArray(d.blockers)) d.blockers = (d.blockers as { symptom?: string }[]).filter((b) => !/made-up|probe|fake client|invalid[_ ]client|client[_ ]id was not found|not a real client/i.test(b.symptom ?? ""));
  // No source mentions a review at all: then no scope triggers one and nothing is harder than moderate.
  if (!/review|verif|approv|assessment|certif/i.test(evidence)) {
    (d.scopes as { triggersReview?: boolean }[] | undefined)?.forEach((s) => (s.triggersReview = false));
    g.verdicts?.forEach((v) => (v.difficulty === "hard" || v.difficulty === "gated") && (v.difficulty = "moderate"));
  }
  // "X OAuth Setup Guide" and "OAuth Setup for Jira" are titles, not names. If nothing of the app's name is left,
  // use what the developer typed.
  if (g.overview) {
    const clean = (g.overview.name ?? "").replace(/\b(OAuth( 2\.0)?|Setup|Guide|Integration|Connect(ion)?|for)\b/gi, " ").replace(/\s+/g, " ").trim();
    const typed = app.trim().split(/\s+/).filter((w) => w.length > 1);
    const sharesName = typed.some((w) => clean.toLowerCase().includes(w.toLowerCase().replace(/[^a-z0-9]/g, "")));
    g.overview.name = clean && (sharesName || !typed.length) ? clean : app.trim() || clean;
  }
  // "when.needs" may only name needs the guide defines; models sometimes put source ids there.
  // Unknown ids are dropped; a verdict left with no condition at all would wrongly apply to everyone, so it goes.
  const known = new Set((g.overview?.needs ?? []).map((n) => n.id));
  const fix = (x: { when?: When }) => {
    if (!x.when?.needs?.length) return true;
    const before = !empty(x.when);
    x.when.needs = x.when.needs.filter((n) => known.has(n));
    return !(before && empty(x.when));
  };
  if (g.verdicts) g.verdicts = g.verdicts.filter((v, i) => i === 0 || fix(v));
  for (const k of ["requirements", "steps", "scopes", "limits", "blockers"])
    if (Array.isArray(g[k])) (g[k] as { when?: When }[]).forEach((x) => fix(x) || (x.when = null));
  g.verdicts?.forEach((v) => (v.waiting = sourcedWait(v.waiting, evidence)));
  // A plain OAuth registration endpoint is not an MCP server; only an MCP URL counts.
  if (g.skip?.mcpServer && !/mcp/i.test(g.skip.mcpServer)) {
    g.skip.mcpServer = null;
    if (g.skip.mcpDcr === "yes") g.skip.mcpDcr = "unknown";
  }
  // "Instant" means nothing to register (an MCP server signs agents up). Anything else needs at least "easy".
  if (g.skip?.mcpDcr !== "yes") g.verdicts?.forEach((v) => v.difficulty === "instant" && (v.difficulty = "easy"));
  // The domain must look like one; otherwise use the official page's.
  if (g.overview) {
    const ok = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(g.overview.domain ?? "");
    const host = ok ? (g.overview.domain as string) : officialUrl ? new URL(officialUrl).hostname : "";
    // The app's domain, not its docs subdomain: asana.com, not developers.asana.com.
    if (host) g.overview.domain = host.toLowerCase().replace(/^(www|developers?|docs|api|dev|help|support)\./, "");
  }
  return g;
}
