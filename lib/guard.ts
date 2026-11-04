// Routes that spend the API key only answer pages on this site (so another site cannot embed them), and each
// visitor gets a fixed number of calls an hour. The Origin header can be forged by a script, so this stops
// casual abuse and runaway pages, not a determined attacker: the free-tier quota is the real ceiling.
const PER_HOUR = { generate: 12, ask: 60, draft: 30 } as const;
// Per-instance memory; a shared store (Vercel KV) would be needed to make the limit exact across instances.
const hits = new Map<string, number[]>();

export function fromThisSite(req: Request, route?: keyof typeof PER_HOUR) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    if (new URL(origin).host !== req.headers.get("host")) return false;
  } catch {
    return false;
  }
  if (!route) return true;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= PER_HOUR[route]) return false;
  hits.set(key, [...recent, now]);
  return true;
}
