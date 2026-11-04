# OAuth Atlas

Look up an app and get a shareable guide to registering its OAuth app and getting it approved: how hard it is, your time versus time waiting on the provider, what you need, what an agent can do for you, and the evidence behind every line. For apps outside the library, a Claude agent investigates live and the guide builds itself on screen.

Built for the Composio APM Integrations take-home. Library: GitHub, Notion, Slack, Gmail, Spotify, Shopify, picked to cover the range (instant, scope-dependent, cost-gated, review-gated).

## Setup

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm check   # situation and stream-folding checks
```

The library, re-checks and sharing work with no keys. The live agent, Ask and Draft need `ANTHROPIC_API_KEY` in the environment (see `.env.example`); without it they say so instead of failing.

## What a guide gives you

- **Quick answer**: how hard, how long (hands-on vs waiting), what you need, who does what, and the quickest path (Composio-managed, or an MCP server with dynamic client registration).
- **Choose your path**: the real routes side by side with their own verdicts (Gmail: testing, send for real users, read inboxes). Picking one re-shapes the guide.
- **Your path**: a timeline where only the next step is open. Each step has a built-in action for who does it: the agent runs it (or copy its prompt), a link to the exact official page, or the expected wait with status and support links. Progress is saved in the browser.
- **Where to go** (verified official links) and **If you get stuck** (symptom, then fix).
- **Ask about this app**: Claude answers with components (verdict for your case, comparison, steps, warning, links, follow-ups you can tap).
- **Evidence**: every claim carries a badge (Tested by agent, Official docs, Third-party, Unverified) and a numbered, dated source. **Re-check live** re-fetches the tested endpoints on the spot.
- **Share**: permalink, Copy Markdown, Copy prompt for your coding agent. Live guides share as a link that carries the whole guide.

## Key decisions

- **Answer the developer's real question first.** Not "how do I click through registration" but "how hard, how long, what blocks me, how sure are you". Hands-on time and waiting time are shown apart.
- **Can you skip it?** Checking Composio-managed auth and MCP auto-registration first saves many developers the whole process.
- **Difficulty depends on the situation.** Items carry `when` conditions (profile, audience, needs) and the guide filters deterministically on the client: instant and reliable, no model call.
- **Generative UI from a fixed catalog.** The agent and Ask never write HTML. They call typed tools (`set_verdict`, `add_step`, `show_compare`...) that render pre-designed components as they stream, the pattern used by the AI SDK, assistant-ui and CopilotKit. The same components render library and live guides.
- **Evidence enforced in code.** A claim without a source shows as Unverified; a "tested" badge on a URL our probes did not fetch in that run is downgraded on the server.
- **Verified by hand, and recorded.** `VERIFICATION.md` (also `/verification`) lists 97 claims: 78 confirmed, 7 corrected, 12 could not verify. Every "Where to go" link was opened.

## Limitations

- Six deep guides, not 100. The schema, live agent and keyless probes are what scale.
- The live agent, Ask and Draft were tested against a scripted stream and a rejected key, not yet against a real Claude run.
- Hands-on times are estimates; waiting times come from providers where published ("Not published" otherwise). CASA cost only comes from third parties.
- Composio-managed status is read from Composio's public toolkit docs, so it depends on that page format.
- Key-spending routes only answer this site's own pages, but there is no per-user rate limit.

No credentials are in this repo. The only secret is `ANTHROPIC_API_KEY`, read from the environment.
