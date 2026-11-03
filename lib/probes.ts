// Keyless probes shared by the live agent and the "Re-check live" button.

// Only public https hosts. Blocks localhost and raw IPs so a probe cannot be pointed inward.
export function safeOrigin(input: string): string | null {
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (u.protocol !== "https:") return null;
    const h = u.hostname;
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export async function getText(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "follow", headers: { "user-agent": "OAuthAtlas/1.0" } });
  return { status: res.status, text: res.ok ? await res.text() : "" };
}

export const composioUrl = (slug: string) => `https://docs.composio.dev/toolkits/${slug.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.md`;

export async function readComposio(slug: string) {
  const url = composioUrl(slug);
  try {
    const { status, text } = await getText(url);
    if (status !== 200) return { url, found: false as const, status };
    const managed = (text.match(/Composio-managed OAuth available\?\*\*\s*(\w+)/i)?.[1] ?? "unknown").toLowerCase();
    const auth = text.match(/\*\*Auth:\*\*\s*([^\n]+)/)?.[1]?.trim();
    const faq = text.split("## Frequently Asked Questions")[1]?.split("## Tools")[0]?.trim().slice(0, 1200);
    return { url, found: true as const, status, managed, auth, faq };
  } catch (e) {
    return { url, found: false as const, error: String(e).slice(0, 120) };
  }
}

export async function readMetadata(url: string) {
  if (!safeOrigin(url)) return { url, error: "Only public https URLs can be probed." };
  try {
    const { status, text } = await getText(url);
    if (status !== 200) return { url, status };
    const j = JSON.parse(text);
    return {
      url,
      status,
      issuer: j.issuer,
      authorization_endpoint: j.authorization_endpoint,
      token_endpoint: j.token_endpoint,
      registration_endpoint: (j.registration_endpoint ?? null) as string | null,
      authorization_servers: j.authorization_servers,
      code_challenge_methods_supported: j.code_challenge_methods_supported,
      scopes_supported: Array.isArray(j.scopes_supported) ? j.scopes_supported.slice(0, 40) : undefined,
    };
  } catch (e) {
    return { url, error: String(e).slice(0, 120) };
  }
}
