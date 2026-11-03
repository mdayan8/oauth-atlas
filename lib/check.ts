// Run: pnpm check
import assert from "node:assert/strict";
import { claimBadge, matches, pickVerdict, type Situation } from "./situation.ts";
import { fold } from "./fold.ts";
import { minutes } from "./duration.ts";

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

// duration: ranges take the upper bound, vague words become a rough number, unknowns stay null
assert.equal(minutes("30 min"), 30);
assert.equal(minutes("2 to 3 hours"), 180);
assert.equal(minutes("Up to 10 days"), 14400);
assert.equal(minutes("Several weeks"), 3 * 7 * 24 * 60);
assert.equal(minutes("Not published"), null);
assert.equal(minutes("Depends on each owner"), null);

console.log("situation + fold + duration: all checks pass");
