// Run: pnpm check
import assert from "node:assert/strict";
import { claimBadge, matches, pickVerdict, type Situation } from "./situation.ts";
import { scrub, sourcedWait, supported, tidyGuide } from "./guards.ts";
import { fold } from "./fold.ts";

const s: Situation = { profile: "individual", audience: "many", needs: ["send"] };

assert.equal(matches(undefined, s), true);
assert.equal(matches({ profile: ["company"] }, s), false);
assert.equal(matches({ needs: ["read", "send"] }, s), true);
assert.equal(matches({ needs: ["read"] }, s), false);
assert.equal(matches({ profile: ["individual"], audience: ["few"] }, s), false);

const base = { handsOn: "", waiting: "", why: "", sourceIds: [] };
const verdicts = [
  { ...base, difficulty: "easy" as const },
  { ...base, difficulty: "gated" as const, when: { needs: ["read"] } },
  { ...base, difficulty: "moderate" as const, when: { needs: ["send"] } },
];
assert.equal(pickVerdict(verdicts, s)?.difficulty, "moderate");
assert.equal(pickVerdict(verdicts, { ...s, needs: ["send", "read"] })?.difficulty, "gated");
assert.equal(pickVerdict(verdicts, { ...s, needs: [] })?.difficulty, "easy");

const sources = [
  { id: "a", title: "", url: "", badge: "third_party" as const, checked: "" },
  { id: "b", title: "", url: "", badge: "official" as const, checked: "" },
];
assert.equal(claimBadge(["a", "b"], sources), "official");
assert.equal(claimBadge(["a"], sources), "third_party");
assert.equal(claimBadge([], sources), "unverified");
assert.equal(claimBadge(["missing"], sources), "unverified");

// fold: streamed tool parts become one guide; a repeated verdict with the same `when` replaces the old one
const parts = [
  { type: "step-start" },
  { type: "tool-set_overview", toolCallId: "a", state: "output-available", input: { name: "Linear", domain: "linear.app", summary: "s", needs: [{ id: "read", label: "Read" }, { id: "", label: "partial" }], defaultNeeds: ["read"] } },
  { type: "tool-set_verdict", toolCallId: "b", state: "output-available", input: { difficulty: "easy", handsOn: "5 min", waiting: "None", why: "", sourceIds: [] } },
  { type: "tool-set_verdict", toolCallId: "c", state: "output-available", input: { difficulty: "moderate", handsOn: "1 h", waiting: "None", why: "", sourceIds: ["s1"] } },
  { type: "tool-cite_source", toolCallId: "d", state: "output-available", input: { id: "s1", title: "Docs", url: "https://linear.app/developers", badge: "tested" }, output: { badge: "unverified", checked: "2026-11-03" } },
  { type: "tool-add_step", toolCallId: "e", state: "input-streaming", input: { title: "Create app" } },
  { type: "tool-add_step", toolCallId: "f", state: "input-streaming", input: {} },
  { type: "tool-web_fetch", toolCallId: "g", state: "input-available", input: { url: "https://linear.app/developers/oauth" } },
];
const { guide: lg, log } = fold(parts, "linear");
assert.equal(lg.name, "Linear");
assert.equal(lg.slug, "linear");
assert.deepEqual(lg.needs.map((n) => n.id), ["read"]);
assert.equal(lg.verdicts.length, 1);
assert.equal(lg.verdicts[0].difficulty, "moderate");
assert.equal(lg.sources[0].badge, "unverified", "server downgrade wins over the agent's claimed badge");
assert.equal(lg.steps.length, 1, "a step with no title yet is not rendered");
assert.equal(lg.steps[0].actor, "you", "missing actor falls back to you");
assert.equal(log.at(-1)?.text, "Reading linear.app/developers/oauth");

// publish_guide: one call carrying the whole guide, still streaming (the last step is half written).
const { guide: pg } = fold(
  [
    {
      type: "tool-publish_guide",
      toolCallId: "w1",
      state: "input-streaming",
      input: {
        overview: { name: "Zoom", domain: "zoom.us", summary: "x", needs: [{ id: "meet", label: "Meetings" }], defaultNeeds: ["meet"] },
        verdicts: [{ difficulty: "easy", handsOn: "10 min", waiting: "None", why: "y", sourceIds: ["s1"] }],
        steps: [{ id: "a", title: "Create the app", actor: "you" }, { title: "" }],
        unverified: ["Review time"],
      },
    },
  ],
  "zoom",
);
assert.equal(pg.name, "Zoom");
assert.equal(pg.verdicts[0].difficulty, "easy");
assert.equal(pg.steps.length, 1, "half-written step waits");
assert.deepEqual(pg.unverified, ["Review time"]);

console.log("situation + fold: all checks pass");

// Reused ids (a step named like a source, two steps with one id) still give unique keys.
const { guide: dg } = fold(
  [
    { type: "tool-cite_source", toolCallId: "c", state: "output-available", input: { id: "s3", title: "t", url: "https://x.dev", badge: "official" } },
    { type: "tool-publish_guide", toolCallId: "w", state: "input-available", input: { steps: [{ id: "s3", title: "A" }, { id: "s3", title: "B" }], requirements: [{ id: "s3", label: "R" }] } },
  ],
  "x",
);
const keys = [...dg.requirements, ...dg.steps].map((x) => x.id);
assert.equal(new Set(keys).size, keys.length, `unique ids: ${keys}`);
assert.equal(dg.sources[0].id, "s3", "source ids are never renamed");

// A review time survives only when the evidence states it.
assert.equal(sourcedWait("2-4 weeks", "Apps go through review. OAuth 2 is used."), "Not published");
assert.equal(sourcedWait("3 days", "Review usually takes 3 business days."), "3 days");
assert.equal(sourcedWait("None", "anything"), "None");
const t = tidyGuide(
  { overview: { domain: "salesforce" }, skip: { mcpServer: "https://login.salesforce.com/services/oauth2/register", mcpDcr: "yes" }, verdicts: [{ difficulty: "instant", waiting: "None" }] },
  "",
  "https://developer.salesforce.com/docs",
);
assert.equal(t.skip.mcpServer, null, "a registration endpoint is not an MCP server");
assert.equal(t.skip.mcpDcr, "unknown");
assert.equal(t.verdicts[0].difficulty, "easy", "instant needs an MCP server that signs agents up");
assert.equal(t.overview.domain, "salesforce.com");
const f = tidyGuide({ skip: { mcpServer: "https://mcp.figma.com/mcp", mcpDcr: "yes" }, verdicts: [{ difficulty: "instant", waiting: "None" }] }, "");
assert.equal(f.verdicts[0].difficulty, "instant", "a real MCP server keeps instant");
const n = tidyGuide(
  {
    overview: { name: "OAuth Setup for Jira", domain: "atlassian.com", needs: [{ id: "read" }] },
    verdicts: [
      { difficulty: "easy", waiting: "None" },
      { difficulty: "moderate", waiting: "None", when: { needs: ["s2", "s3"] } },
      { difficulty: "hard", waiting: "None", when: { audience: ["many"], needs: ["s2", "read"] } },
    ],
    steps: [{ title: "A", when: { needs: ["s9"] } }],
  },
  "Public apps go through review.",
);
assert.equal(n.overview.name, "Jira");
assert.equal(tidyGuide({ overview: { name: "OAuth Setup Guide" } }, "", undefined, "Zendesk").overview.name, "Zendesk");
assert.equal(tidyGuide({ overview: { name: "X OAuth Setup Guide" } }, "", undefined, "X (Twitter)").overview.name, "X (Twitter)");
assert.deepEqual(n.verdicts.map((v) => v.difficulty), ["easy", "hard"], "a verdict tied only to made-up needs is dropped");
assert.deepEqual(n.verdicts[1].when?.needs, ["read"]);
assert.equal((n.steps as { when: unknown }[])[0].when, null, "a step tied only to made-up needs shows for everyone");
const e = tidyGuide(
  {
    skip: { mcpServer: null, mcpDcr: "unknown", composioManaged: "no" },
    verdicts: [{ difficulty: "hard", waiting: "None" }],
    scopes: [{ name: "admin", triggersReview: true }],
    blockers: [{ symptom: "HTTP 404 when using a made-up client id" }, { symptom: "Redirect URI mismatch" }],
  },
  "The docs describe scopes: read, write, admin. No mention of any gate.",
  undefined,
  "Linear",
  { mcp: { server: "https://mcp.linear.app", dcr: true }, composio: { managed: "yes" } },
);
assert.equal(e.skip.mcpDcr, "yes", "probes decide the skip section");
assert.equal(e.skip.mcpServer, "https://mcp.linear.app");
assert.equal(e.skip.composioManaged, "yes");
assert.equal(e.verdicts[0].difficulty, "moderate", "no review in the evidence means nothing harder than moderate");
assert.equal((e.scopes as { triggersReview: boolean }[])[0].triggersReview, false);
assert.deepEqual((e.blockers as { symptom: string }[]).map((b) => b.symptom), ["Redirect URI mismatch"], "probe artifacts are not blockers");
const bare = tidyGuide({ verdicts: [{ difficulty: "easy", waiting: "None", handsOn: "10 min" }], scopes: [{ name: "x" }], limits: [{ title: "y" }], unverified: [] }, "", undefined, "Trello", { officialPages: 0 });
assert.deepEqual(bare.scopes, [], "no docs read means no scope names");
assert.equal((bare.verdicts[0] as { handsOn: string }).handsOn, "Not published");
assert.match(bare.unverified[0], /No official documentation/);
const ev = "Scopes: read, write, issues:create, admin. Access tokens expire after 24 hours. [s2] Apps go through review.";
const fab = tidyGuide(
  {
    verdicts: [{ difficulty: "easy", waiting: "None" }],
    scopes: [{ name: "issues:create", sourceIds: ["s2"] }, { name: "manage_databases", sourceIds: ["s2"] }],
    limits: [{ title: "Tokens expire", detail: "Access tokens expire after 24 hours.", sourceIds: ["s2"] }, { title: "Rate limits", detail: "Enforced per account.", sourceIds: ["s2"] }],
    steps: [{ title: "Register the client", detail: "POST to the registration endpoint at /register.", actor: "you" }],
  },
  ev,
);
assert.deepEqual((fab.scopes as { name: string }[]).map((x) => x.name), ["issues:create"], "a scope the evidence does not name is dropped");
assert.deepEqual((fab.limits as { title: string }[]).map((x) => x.title), ["Tokens expire"], "a limit the evidence does not support is dropped");
assert.equal((fab.steps as { actor: string }[])[0].actor, "agent", "dynamic registration is the agent's step");
assert.equal(supported("Up to 100 users in testing", "Testing mode allows 100 users."), true);
const leak = tidyGuide(
  {
    overview: { name: "Discord", domain: "developers.discord.com", summary: "Register an app. The probe with a made-up client id returned HTTP 400." },
    skip: { note: "Composio manages it. We used a made-up client id and got Invalid client_id.", mcpDcr: "no" },
    verdicts: [
      { difficulty: "instant", waiting: "None", why: "Composio-managed OAuth is ready without registration." },
      { difficulty: "easy", waiting: "None", why: "Self-serve console." },
    ],
    blockers: [{ symptom: "Authorize returns HTTP 400 and says the client ID is not a snowflake" }, { symptom: "Redirect URI mismatch" }],
    unverified: ["The HTTP 500 from the authorize attempt used a made-up client id", "Review time"],
    links: [{ url: "https://a.com/x" }, { url: "https://a.com/x" }],
  },
  "Apps go through review.",
);
assert.equal(leak.overview.summary, "Register an app.");
assert.equal(leak.skip.note, "Composio manages it.");
assert.deepEqual(leak.verdicts.map((v) => v.difficulty), ["easy"], "the Composio verdict is not an own-app verdict");
assert.deepEqual((leak.blockers as { symptom: string }[]).map((b) => b.symptom), ["Redirect URI mismatch"]);
assert.deepEqual(leak.unverified, ["Review time"]);
assert.equal(leak.overview.domain, "discord.com");
assert.equal((leak.links as unknown[]).length, 1);
assert.equal(scrub("Fine sentence. Our probe said no. Another fine one."), "Fine sentence. Another fine one.");
console.log("guards: checks pass");
