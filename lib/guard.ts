// Routes that spend the API key only answer pages on this site, so another site can't embed them.
// ponytail: no per-user rate limit; add one (e.g. Vercel KV) before sharing the link widely.
export function fromThisSite(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
