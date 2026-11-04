import { cleanHtml, getText, readComposio, readMetadata, safeOrigin, searchWeb, tryAuthorize } from "./probes";
import type { Source } from "./schema";

// The free-tier route: collect real evidence in code, in parallel, in a few seconds, then let one model
// call write the guide. Each probe streams to the screen as a tool part, so the ticker shows real work.

type Emit = (name: string, input: unknown, run: () => Promise<any>) => Promise<any>;

const RELEVANT = /oauth|scope|sensitive|restricted|security assessment|redirect|callback|client[ _-]?(id|secret)|review|verif|approv|rate limit|quota|install|marketplace|token|expir|refresh|pkce|consent|publish|distribut|webhook/i;
const AUTHORIZE = /https:\/\/[a-z0-9.-]+\/[^\s"'<>()\\]*?(oauth2?\/(v\d\/)?auth(orize)?|\/authorize)\b[^\s"'<>()\\]*/gi;

// Keep only sentences about OAuth setup, so a short budget holds the useful part of a long doc page.
export function excerpt(text: string, max = 1200) {
  const out: string[] = [];
  let n = 0;
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (s.length < 30 || s.length > 360 || !RELEVANT.test(s)) continue;
    out.push(s.trim());
    if ((n += s.length) > max) break;
  }
  return out.join(" ");
}

const baseDomain = (h: string) => h.split(".").slice(-2).join(".");
const THIRD_PARTY = /^(stackoverflow|medium|github|dev|reddit|youtube|composio|nango|wikipedia|quora|linkedin)$/;

export async function gather(app: string, emit: Emit) {
  // "Google Calendar" -> Composio slug "googlecalendar"; "linear.app" -> "linear". Name words find official hosts.
  const name = app.replace(/^https?:\/\/|^www\./g, "").split("/")[0].replace(/\.(com|io|app|ai|co|dev|so|org|net)$/i, "");
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "") || "app";
  // Composio names some toolkits by the product word: "Microsoft Outlook" is "outlook", "X (Twitter)" is "twitter".
  const candidates = [...new Set([slug, ...words.filter((w) => w.length >= 3).reverse()])].slice(0, 3);
  const sources: Omit<Source, "checked">[] = [];
  const lines: string[] = [];
  const cite = (s: Omit<Source, "id" | "checked">, evidence: string) => {
    const id = `s${sources.length + 1}`;
    sources.push({ id, ...s });
    lines.push(`[${id}] ${s.title} (${s.url}, ${s.badge}): ${evidence}`);
    return id;
  };

  const queries = [`${app} OAuth app register developer docs`, `${app} OAuth scopes app review`];
  const [hitsA, hitsB, composio] = await Promise.all([
    ...queries.map((query) => emit("web_search", { query }, () => searchWeb(query).then((results) => ({ query, results })).catch(() => ({ query, results: [] })))),
    emit("check_composio", { slug }, async () => {
      const all = await Promise.all(candidates.map(readComposio));
      return all.find((r) => r.found) ?? all[0];
    }),
  ]);

  // Official pages first: the host carries the app's name. Fill up with others, marked third party.
  const seen = new Set<string>();
  const hits = [...hitsA.results, ...hitsB.results].filter((r: { url: string }) => {
    const key = r.url.split("#")[0];
    if (!safeOrigin(r.url) || seen.has(key) || /composio\.dev|nango\.dev|youtube\.com|reddit\.com/.test(r.url)) return false;
    seen.add(key);
    return true;
  });
  // Official = the site's own domain: its main label is a word of the name ("docs.x.com" for X, "learn.microsoft.com"
  // for Microsoft Outlook), not just containing it ("twitterapi.io" is third party). When no result matches the name
  // (Jira lives on atlassian.com), the domain most results share is taken as the official one.
  const label = (u: string) => new URL(u).hostname.split(".").slice(-2)[0];
  const named = (u: string) => label(u) === slug || words.includes(label(u));
  const counts = new Map<string, number>();
  for (const h of hits) counts.set(label(h.url), (counts.get(label(h.url)) ?? 0) + 1);
  const common = [...counts].filter(([l, n]) => n >= 2 && !THIRD_PARTY.test(l)).sort((a, b) => b[1] - a[1])[0]?.[0];
  const anyNamed = hits.some((h) => named(h.url));
  const official = (u: string) => named(u) || (!anyNamed && label(u) === common);
  // Search engines block cloud servers, so the live site often gets no hits. Composio's toolkit page links to the
  // provider's developer docs: the host it links most is the official docs host, and its OAuth pages fill the gap.
  const fromComposio: string[] = (composio.found ? composio.links : [])
    .filter((u: string) => safeOrigin(u))
    .map((u: string) => u.split("#")[0]);
  // Developer hosts beat support sites; among those, the one Composio links most.
  const hostScore = (h: string) => (/developer|docs|^dev\./.test(h) ? 3 : /\bapi\b|^api\./.test(h) ? 2 : /support|help|status/.test(h) ? 0 : 1);
  const hostCounts = fromComposio.reduce((m, u) => m.set(new URL(u).hostname, (m.get(new URL(u).hostname) ?? 0) + 1), new Map<string, number>());
  const docHost = [...hostCounts].sort((a, b) => hostScore(b[0]) - hostScore(a[0]) || b[1] - a[1])[0]?.[0];
  // Many docs sites publish llms.txt, an index of every page: the OAuth pages are picked from it directly.
  const llms = docHost
    ? await emit("web_fetch", { url: `https://${docHost}/llms.txt` }, () =>
        getText(`https://${docHost}/llms.txt`).then((r) => ({ url: `https://${docHost}/llms.txt`, status: r.status, raw: r.status === 200 ? r.text.slice(0, 400_000) : "" })).catch(() => ({ url: "", status: 0, raw: "" })),
      )
    : null;
  const fromLlms = ((llms?.raw as string | undefined) ?? "")
    .split("\n")
    .filter((line) => /oauth|authoriz|scopes?\b|create (an? )?(oauth )?app|app (review|marketplace|submission)/i.test(line))
    .sort((a, b) => Number(/oauth/i.test(b)) - Number(/oauth/i.test(a)))
    .map((line) => line.match(/https:\/\/[^)\s"]+/)?.[0])
    .filter((u): u is string => !!u && !!safeOrigin(u))
    .slice(0, 4);
  const fallback = docHost
    ? [
        ...new Set([
          ...fromLlms,
          ...fromComposio.filter((u) => /oauth|auth|integrations|apps?\b|scopes|register/i.test(new URL(u).pathname)),
          `https://${docHost}/docs/integrations/oauth/`,
          `https://${docHost}/docs/oauth/`,
          `https://${docHost}/docs/authentication/`,
          `https://${docHost}/`,
        ]),
      ].map((url) => ({ url, title: new URL(url).hostname + new URL(url).pathname }))
    : [];
  if (docHost && !hits.some((h) => new URL(h.url).hostname === docHost)) hits.push({ url: `https://${docHost}/`, title: docHost });
  const picked = [...hits.filter((h) => official(h.url)), ...fallback.filter((f) => !hits.some((h) => h.url === f.url)), ...hits.filter((h) => !official(h.url))].slice(0, 4);

  const pages = (
    await Promise.all(
      picked.map((h) =>
        emit("web_fetch", { url: h.url }, () => getText(h.url).then((r) => ({ url: h.url, status: r.status, raw: r.text })).catch(() => ({ url: h.url, status: 0, raw: "" }))),
      ),
    )
  ).filter((p) => p.status === 200 && p.raw);

  // Composio first: it decides whether the developer can skip all of this.
  if (composio.found) cite({ title: `Composio toolkit page`, url: composio.url, badge: "tested" }, `Composio-managed OAuth available: ${composio.managed}. Auth: ${composio.auth ?? "not stated"}.`);
  else cite({ title: `Composio toolkit page`, url: composio.url, badge: "tested" }, "No Composio toolkit page found, so no Composio-managed app.");

  const authorizeUrls: string[] = [];
  for (const p of pages) {
    const text = excerpt(cleanHtml(p.raw));
    authorizeUrls.push(...(p.raw.match(AUTHORIZE) ?? []).map((u: string) => u.replace(/&amp;/g, "&")).filter((u: string) => safeOrigin(u) && official(u)));
    if (!text) continue;
    const h = picked.find((x) => x.url === p.url)!;
    cite({ title: h.title.slice(0, 90) || new URL(p.url).hostname, url: p.url, badge: official(p.url) ? "official" : "third_party" }, text);
  }

  // Discovery documents on the official domain, plus any auth host the docs point at.
  // Providers that let agents sign themselves up host it at mcp.<domain> (Linear, Notion, Figma), so that is
  // probed on every official domain, not only hosts the docs happen to mention.
  const origins = new Set<string>();
  for (const u of [...picked.filter((h) => official(h.url)).map((h) => h.url), ...authorizeUrls].slice(0, 4)) {
    const host = new URL(u).hostname;
    for (const h of [host, baseDomain(host), `mcp.${baseDomain(host)}`]) {
      const o = safeOrigin(`https://${h}`);
      if (o) origins.add(o);
    }
  }
  const meta = await Promise.all(
    [...origins].slice(0, 5).map((origin) =>
      emit("probe_oauth_metadata", { origin }, async () => {
        const paths = ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"];
        return { origin, results: await Promise.all(paths.map((p) => readMetadata(origin + p))) };
      }),
    ),
  );
  let mcp: { server: string; dcr: boolean } | undefined;
  for (const m of meta)
    for (const r of m.results)
      if (r.status === 200 && r.authorization_endpoint) {
        if (/^https:\/\/mcp\./.test(m.origin) && !mcp) mcp = { server: m.origin, dcr: !!r.registration_endpoint };
        authorizeUrls.unshift(r.authorization_endpoint);
        cite(
          { title: `Discovery document at ${new URL(r.url).host}`, url: r.url, badge: "tested" },
          `authorization_endpoint ${r.authorization_endpoint}; token_endpoint ${r.token_endpoint}; dynamic client registration: ${r.registration_endpoint ? "yes, " + r.registration_endpoint : "no"}; PKCE methods: ${(r.code_challenge_methods_supported ?? []).join(", ") || "not listed"}.`,
        );
      }

  // The hands-on attempt: the real authorize step with a made-up client id, no login.
  const target = authorizeUrls.find((u) => safeOrigin(u) && !/[{}<>]|your[a-z_-]*key|example/i.test(u));
  if (target) {
    const r = await emit("try_authorize", { authorizeUrl: target }, () => tryAuthorize(target));
    cite(
      { title: `Authorize attempt with a made-up client id`, url: r.url, badge: "tested" },
      `HTTP ${r.status ?? "no answer"}${r.redirectsTo ? `, redirects to ${r.redirectsTo}` : ""}${r.error ? `, error "${r.error}"` : ""}${r.asksToSignInFirst ? ", asks the user to sign in first" : ""}${r.hint ? `, page says "${r.hint}"` : ""}.`,
    );
  }

  const unread = hits.filter((h) => !picked.includes(h)).slice(0, 4).map((h) => `${h.title.slice(0, 70)}: ${h.url}`);
  return {
    sources,
    mcp,
    composio: composio.found ? { managed: composio.managed, auth: composio.auth } : undefined,
    evidence: [...lines, unread.length ? `Other pages found, not read: ${unread.join("; ")}` : ""].join("\n"),
  };
}

