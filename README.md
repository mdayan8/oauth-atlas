# OAuth Atlas

Look up an app and get a shareable guide to registering its OAuth app and getting it approved: how hard it is, your hands-on time versus time waiting on the provider, what you need, what an AI agent can do for you, and the evidence behind every line. For apps not in the library, a Claude agent investigates live and the guide builds itself on screen.

Built for the Composio APM Integrations take-home.

## What a guide answers

The brief asks that a developer knows where to start, what to do next, the time and effort, and how to proceed when blocked. A guide page has four parts, top to bottom:

1. **Quick answer**: the brief's four questions in plain words. How hard (Instant, Easy, Moderate, Hard or Gated), how long (your hands-on time and the wait on the provider, shown apart), what you need, and who does what (steps an agent can do, steps you do, steps spent waiting). Under it, the quickest path: is the app already Composio-managed, or does its MCP server sign agents up automatically (dynamic client registration)?
2. **Your situation**: who you are (individual, startup, company), who will connect (just you and testers, or real users) and what your agent needs (for Gmail: send, read, modify, labels). Changing these re-shapes the verdict, requirements, steps and limits instantly.
3. **Your path**: "Get these ready" first, then every step in order, tagged **Agent can do / You do / Waiting on provider** with a duration. Only the next step is open; tick a step and the next one opens. Progress is saved in your browser.
4. **Details**, in tabs so the page stays short: If you get stuck (what you see, what to do), Limits and gotchas, Permissions (with review tiers), and Sources.

**The agent does its part, not just the research.** The brief asks to "use agents to investigate and attempt as much of the setup process as practical". So:

- **Draft it for me**: every requirement tagged "Agent can draft" (privacy policy, scope justification, demo video script) has a button. Claude writes the draft from the provider's stated requirements and the scopes you picked, with [placeholders] for anything about your company it can't know (`app/api/draft/route.ts`).
- **Re-check live**: one click re-fetches every agent-tested claim in a guide (Composio's managed status, the provider's OAuth discovery documents, the MCP registration endpoint) and shows "4 of 4 still true as of just now", or what changed. No API key needed (`app/api/recheck/route.ts`).
- **Copy prompt for your agent** hands the rest (the OAuth code, token refresh) to your coding agent.

The home page shows the core insight as a chart: each app's bar runs from its easiest situation to its hardest (Spotify goes from Easy to Gated).

Every claim shows a badge (Tested by agent, Official docs, Third-party, Unverified) and links to its numbered sources, each with a last-checked date, plus a list of what we could not verify. Share with a permalink (`/guide/<slug>`), Copy Markdown, or Copy prompt for your coding agent (it splits the agent's work from yours and tells it to re-check the sources).

The library holds six guides chosen to cover different shapes: GitHub (easy, but org owners may need to approve), Notion (easy, plus an MCP server with auto-registration), Slack (easy in your own workspace, hard on the Marketplace), Gmail (scope-dependent: send is a sensitive scope, read is restricted and needs a yearly security assessment), Spotify (fine for 5 users, gated past that unless you are an organisation with 250k+ monthly users), and Shopify (custom app vs App Store, with an irreversible distribution choice).

## Setup

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm check          # runs the situation and stream-folding checks
```

The library works with no keys. For the live agent, set `ANTHROPIC_API_KEY` in the environment (see `.env.example`). On Vercel, add it under Project Settings, Environment Variables. Without it the live page says the key is missing instead of failing.

## How it works

- **One schema** (`lib/schema.ts`, zod) for library and live guides. Library guides are JSON in `data/guides/` and are parsed at build time, so a bad guide fails the build, not a reader's page.
- **Adaptive guides are deterministic.** Each verdict and item can carry `when: { profile, audience, needs }`. The client filters items and shows the hardest verdict that applies (`lib/situation.ts`). No model call, so it is instant and can't drift.
- **The live agent** (`app/api/generate/route.ts`, `lib/agent.ts`) runs Claude Sonnet 5.5 through the Vercel AI SDK with a 25-step limit. Tools:
  - Anthropic web search and web fetch, aimed at the provider's own docs.
  - `check_composio`: reads `docs.composio.dev/toolkits/<slug>.md` for "Composio-managed OAuth available?".
  - `probe_oauth_metadata`: fetches `/.well-known/openid-configuration`, `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource` on the auth origin and the MCP server origin, which is how DCR support is detected. Public https origins only.
  - UI tools (`set_overview`, `set_verdict`, `set_skip_path`, `add_requirement`, `add_step`, `add_scope`, `add_limit`, `add_blocker`, `cite_source`, `flag_unverified`). Each call streams to the browser and renders a card. `lib/fold.ts` folds the stream into a guide; a repeated `set_verdict` with the same `when` replaces the old one, so the meter visibly moves when the agent learns more.
- **Evidence guardrails in code, not only in the prompt.** A claim with no `sourceIds` renders as Unverified. If the agent badges a source "tested" but our probes did not fetch that URL in this run, the server downgrades it to Unverified.
- **Sharing live guides without a database.** Copy link packs the guide into the URL fragment, deflated (`lib/pack.ts`), and `/shared` unpacks it.

## Key decisions

- **Build what the brief asks, polished, plus three small extras** (the skip check, situation re-shaping, light and dark Composio styling). I did not build an MCP endpoint, MDX or SKILL.md exports, or accounts.
- **Typed UI tools instead of free-form generated UI.** The agent fills pre-designed cards. That makes a live demo reliable and lets the same components render the library.
- **Split time into hands-on and waiting.** Developers can plan around a 6-week review if they know it is coming. A single "time" number hides that.
- **Verify the seed library against official pages and endpoints, and record it.** `VERIFICATION.md` (also at `/verification`) lists 97 claims: 78 confirmed, 7 corrected, 12 could not verify. Examples of corrections: Google's own figure for sensitive scope review is "up to 10 days"; GitHub's hosted MCP server does not support DCR; Slack Marketplace review is two stages (up to 10 business days, then up to 10 weeks).

## Limitations

- Six library guides, not 100. The schema and the live agent are what scale; a "save to library" flow with human review is the next step.
- Hands-on times are our estimates. Waiting times come from providers where they publish them, and say "Not published" where they don't (Shopify App Store review, for example).
- Live guides are only as good as what the agent can reach in about 25 steps. Some official pages block fetchers, and the agent does not log in or create accounts, so anything behind a console is marked "You do" and often Unverified.
- CASA assessment cost and duration come only from third-party labs.
- Composio-managed status is read from Composio's public toolkit docs, not the API, so it needs no key but depends on those pages staying in the same format.
- Live guides are not stored; the share link carries the whole guide.
- The routes that spend the API key (`/api/generate`, `/api/draft`) only answer requests from this site's own pages, but there is no per-user rate limit yet.

No credentials are in this repo. The only secret is `ANTHROPIC_API_KEY`, read from the environment.
