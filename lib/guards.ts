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
  overview?: { name?: string; domain?: string | null; needs?: { id: string }[] } | null;
  skip?: { mcpServer?: string | null; mcpDcr?: string; composioManaged?: string } | null;
  verdicts?: { difficulty?: string; waiting: string; when?: When }[] | null;
  unverified?: string[] | null;
  [list: string]: unknown;
};

const empty = (w: When) => !w || (!w.profile?.length && !w.audience?.length && !w.needs?.length);

export type Found = {
  mcp?: { server: string; dcr: boolean };
  composio?: { managed: string; auth?: string };
  officialPages?: number;
};

export function tidyGuide<T extends Draft>(g: T, evidence: string, officialUrl?: string, app = "", found: Found = {}): T {
  // What the probes saw beats what the model wrote: the skip section is the headline and it must be right.
  if (g.skip) {
    if (found.mcp) {
      g.skip.mcpServer = found.mcp.server;
      g.skip.mcpDcr = found.mcp.dcr ? "yes" : "no";
    }
    if (found.composio?.managed === "yes" || found.composio?.managed === "no") g.skip.composioManaged = found.composio.managed;
  }
  // No official page could be read (search blocked, no docs link): say so instead of showing an empty guide.
  if (found.officialPages === 0) {
    const d0 = g as Draft;
    const note = "No official documentation page could be read in this run, so only Composio's status and live endpoint checks are shown. Open the provider's developer docs for the steps.";
    d0.unverified = [note, ...((d0.unverified as string[] | undefined) ?? [])];
    g.verdicts?.forEach((v) => ((v as { handsOn?: string }).handsOn = "Not published"));
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
  if (g.overview && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(g.overview.domain ?? "") && officialUrl)
    g.overview.domain = new URL(officialUrl).hostname.split(".").slice(-2).join(".");
  return g;
}
