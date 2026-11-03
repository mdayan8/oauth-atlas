// Run: pnpm check
import assert from "node:assert/strict";
import { claimBadge, matches, pickVerdict, type Situation } from "./situation.ts";

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

console.log("situation: all checks pass");
