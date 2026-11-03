// Rough minutes from a human duration like "30 min", "2 to 3 hours", "Up to 10 days", "Several weeks".
// Ranges take the upper bound: plan for the long end. Returns null when the text gives no number.
const UNIT: [RegExp, number][] = [
  [/min/, 1],
  [/hour|hr/, 60],
  [/business day/, 60 * 24 * 1.4],
  [/day/, 60 * 24],
  [/week/, 60 * 24 * 7],
  [/month/, 60 * 24 * 30],
];

export function minutes(text: string): number | null {
  const t = text.toLowerCase();
  const unit = UNIT.find(([re]) => re.test(t))?.[1];
  if (!unit) return null;
  const nums = [...t.matchAll(/\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  const n = nums.length ? Math.max(...nums) : /several|few/.test(t) ? 3 : /a |an |one /.test(t) ? 1 : null;
  return n == null ? null : n * unit;
}
