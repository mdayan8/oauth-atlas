import type { BadgeT, Difficulty, Guide, Source, Verdict, WhenT } from "./schema";

export type Profile = "individual" | "startup" | "company";
export type Audience = "few" | "many";
export type Situation = { profile: Profile; audience: Audience; needs: string[] };

const ORDER: Difficulty[] = ["instant", "easy", "moderate", "hard", "gated"];
const BADGE_ORDER: BadgeT[] = ["tested", "official", "third_party", "unverified"];

export function defaultSituation(g: Pick<Guide, "defaultNeeds" | "needs">): Situation {
  return { profile: "startup", audience: "many", needs: g.defaultNeeds.length ? g.defaultNeeds : g.needs.slice(0, 1).map((n) => n.id) };
}

export function matches(when: WhenT | undefined, s: Situation): boolean {
  if (!when) return true;
  if (when.profile?.length && !when.profile.includes(s.profile)) return false;
  if (when.audience?.length && !when.audience.includes(s.audience)) return false;
  if (when.needs?.length && !when.needs.some((n) => s.needs.includes(n))) return false;
  return true;
}

// The hardest verdict that applies wins: you are blocked by your hardest requirement.
export function pickVerdict(verdicts: Verdict[], s: Situation): Verdict | undefined {
  let best: Verdict | undefined;
  for (const v of verdicts) {
    if (!matches(v.when, s)) continue;
    if (!best || ORDER.indexOf(v.difficulty) >= ORDER.indexOf(best.difficulty)) best = v;
  }
  return best;
}

export function resolve(g: Guide, s: Situation) {
  const keep = <T extends { when?: WhenT }>(xs: T[]) => xs.filter((x) => matches(x.when, s));
  const requirements = keep(g.requirements);
  const steps = keep(g.steps);
  const scopes = keep(g.scopes);
  const limits = keep(g.limits);
  const blockers = keep(g.blockers);
  const total = g.requirements.length + g.steps.length + g.scopes.length + g.limits.length + g.blockers.length;
  const shown = requirements.length + steps.length + scopes.length + limits.length + blockers.length;
  return { verdict: pickVerdict(g.verdicts, s), requirements, steps, scopes, limits, blockers, hidden: total - shown };
}

export type Resolved = ReturnType<typeof resolve>;

// A claim is as strong as its strongest source. No source means unverified.
export function claimBadge(sourceIds: string[] | undefined, sources: Source[]): BadgeT {
  let best = BADGE_ORDER.length - 1;
  for (const id of sourceIds ?? []) {
    const src = sources.find((x) => x.id === id);
    if (src) best = Math.min(best, BADGE_ORDER.indexOf(src.badge));
  }
  return BADGE_ORDER[best];
}

export const difficultyIndex = (d: Difficulty) => ORDER.indexOf(d);
