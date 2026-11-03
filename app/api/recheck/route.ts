import { getGuide } from "@/lib/guides";
import { readComposio, readMetadata } from "@/lib/probes";

// Re-runs a library guide's agent-tested claims against the live endpoints. No API key needed.
// Only URLs already in our own guide data are fetched, never user input.
export async function GET(req: Request) {
  const g = getGuide(new URL(req.url).searchParams.get("slug") ?? "");
  if (!g) return Response.json({ error: "unknown_guide" }, { status: 404 });

  const tested = g.sources.filter((s) => s.badge === "tested" && /\.well-known\//.test(s.url));
  const [composio, ...meta] = await Promise.all([readComposio(g.slug), ...tested.map((s) => readMetadata(s.url))]);

  const live = meta.filter((m) => m.status === 200);
  const dcr = live.some((m) => "registration_endpoint" in m && m.registration_endpoint) ? "yes" : "no";
  const managed = composio.found ? composio.managed : "unknown";
  const say = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "Not sure");

  const items = [
    {
      label: "Composio already manages it",
      url: composio.url,
      ok: managed === g.skip.composioManaged,
      finding: composio.found ? `Guide says ${say(g.skip.composioManaged)}. Composio's docs say ${say(managed)} right now.` : "Could not read Composio's docs right now.",
    },
    ...(live.length
      ? [
          {
            label: "MCP server signs agents up automatically",
            url: live[0].url,
            ok: dcr === g.skip.mcpDcr,
            finding: `Guide says ${say(g.skip.mcpDcr)}. ${dcr === "yes" ? "A live endpoint advertises a registration endpoint." : live.length === 1 ? "The live discovery document advertises no registration endpoint." : `None of the ${live.length} live discovery documents advertise a registration endpoint.`}`,
          },
        ]
      : []),
    ...meta.map((m, i) => ({
      label: tested[i].title,
      url: m.url,
      ok: m.status === 200,
      finding:
        m.status === 200
          ? `Responds now.${"issuer" in m && m.issuer ? ` Issuer ${m.issuer}.` : ""} Registration endpoint: ${"registration_endpoint" in m && m.registration_endpoint ? m.registration_endpoint : "none"}.`
          : `Did not respond as before (${"error" in m ? m.error : `HTTP ${m.status}`}).`,
    })),
  ];

  return Response.json({ checkedAt: new Date().toISOString(), items }, { headers: { "cache-control": "no-store" } });
}
