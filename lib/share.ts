import type { Guide } from "./schema";
import type { Resolved, Situation } from "./situation";

export const DIFFICULTY_LABEL = { instant: "Instant", easy: "Easy", moderate: "Moderate", hard: "Hard", gated: "Gated" };
export const BADGE_LABEL = { tested: "Tested by agent", official: "Official docs", third_party: "Third-party", unverified: "Unverified" };
export const ACTOR_LABEL = { agent: "Agent can do", you: "You do", provider: "Waiting on provider" };
const PROFILE_LABEL = { individual: "Individual", startup: "Startup", company: "Company" };
const AUDIENCE_LABEL = { few: "Just me and testers", many: "Real users" };

function situationLine(g: Guide, s: Situation) {
  const needs = g.needs.filter((n) => s.needs.includes(n.id)).map((n) => n.label);
  return [PROFILE_LABEL[s.profile], AUDIENCE_LABEL[s.audience], ...needs].join(", ");
}

const cite = (ids: string[] | undefined, g: Guide) => {
  const nums = (ids ?? []).map((id) => g.sources.findIndex((x) => x.id === id) + 1).filter((n) => n > 0);
  return nums.length ? ` [${nums.join(", ")}]` : " (unverified)";
};

export function toMarkdown(g: Guide, r: Resolved, s: Situation, url?: string) {
  const v = r.verdict;
  const out: string[] = [`# ${g.name} OAuth app: setup and approval guide`, ""];
  out.push(`For: ${situationLine(g, s)}. Last checked ${g.checked}.${url ? ` Live guide: ${url}` : ""}`, "");
  if (v) {
    out.push(`**Verdict: ${DIFFICULTY_LABEL[v.difficulty]}.** Hands-on: ${v.handsOn}. Waiting on ${g.name}: ${v.waiting}.`);
    out.push("", `${v.why}${cite(v.sourceIds, g)}`, "");
  }
  out.push("## Can you skip it?", "", `- Composio-managed auth: ${g.skip.composioManaged}`, `- MCP with dynamic client registration: ${g.skip.mcpDcr}${g.skip.mcpServer ? ` (${g.skip.mcpServer})` : ""}`, `- ${g.skip.note}`, "");
  if (g.links.length) {
    out.push("## Where to go", "");
    for (const l of g.links) out.push(`- [${l.label}](${l.url})${l.note ? ` (${l.note})` : ""}`);
    out.push("");
  }
  if (r.requirements.length) {
    out.push("## Requirements", "");
    for (const x of r.requirements) out.push(`- [ ] **${x.label}**: ${x.detail}${x.agentCanDraft ? " _(an agent can draft this)_" : ""}${cite(x.sourceIds, g)}`);
    out.push("");
  }
  if (r.steps.length) {
    out.push("## Steps", "");
    r.steps.forEach((x, i) => out.push(`${i + 1}. **${x.title}** (${ACTOR_LABEL[x.actor]}, ${x.duration}): ${x.detail}${cite(x.sourceIds, g)}`));
    out.push("");
  }
  if (r.scopes.length) {
    out.push("## Scopes", "", "| Scope | What it allows | Tier | Triggers review |", "|---|---|---|---|");
    for (const x of r.scopes) out.push(`| \`${x.name}\` | ${x.meaning} | ${x.tier} | ${x.triggersReview ? "Yes" : "No"} |`);
    out.push("");
  }
  if (r.limits.length) {
    out.push("## Limits and gotchas", "");
    for (const x of r.limits) out.push(`- **${x.title}**: ${x.detail}${cite(x.sourceIds, g)}`);
    out.push("");
  }
  if (r.blockers.length) {
    out.push("## If you get blocked", "");
    for (const x of r.blockers) out.push(`- **${x.symptom}**: ${x.fix}${cite(x.sourceIds, g)}`);
    out.push("");
  }
  out.push("## Sources", "");
  g.sources.forEach((x, i) => out.push(`${i + 1}. [${x.title}](${x.url}) (${BADGE_LABEL[x.badge]}, checked ${x.checked})`));
  if (g.unverified.length) {
    out.push("", "## Could not verify", "");
    for (const x of g.unverified) out.push(`- ${x}`);
  }
  return out.join("\n");
}

export function toAgentPrompt(g: Guide, r: Resolved, s: Situation) {
  const agentSteps = r.steps.filter((x) => x.actor === "agent");
  const youSteps = r.steps.filter((x) => x.actor !== "agent");
  const drafts = r.requirements.filter((x) => x.agentCanDraft);
  return [
    `I am adding "Connect ${g.name}" (OAuth) to my app. My situation: ${situationLine(g, s)}.`,
    `Scopes I plan to request: ${r.scopes.map((x) => x.name).join(", ") || "not decided yet"}.`,
    "",
    "Please do the parts you can do without logging in to anything:",
    ...agentSteps.map((x) => `- ${x.title}: ${x.detail}`),
    ...drafts.map((x) => `- Draft: ${x.label}. ${x.detail}`),
    "- Write the OAuth authorization code flow (with PKCE where supported) and token refresh handling, reading the client id and secret from environment variables. Never hard-code secrets.",
    "",
    "I will do these myself, so just tell me when you need the result:",
    ...youSteps.map((x) => `- ${x.title}`),
    "",
    "Gotchas to design around:",
    ...r.limits.map((x) => `- ${x.title}: ${x.detail}`),
    "",
    ...(g.links.length ? ["Official pages for this provider:", ...g.links.map((l) => `- ${l.label}: ${l.url}`), ""] : []),
    "Check anything you rely on against these sources first, they may have changed:",
    ...g.sources.map((x) => `- ${x.url}`),
    "",
    "Do not invent limits or review timelines. If a source does not say it, tell me it is unverified.",
  ].join("\n");
}

