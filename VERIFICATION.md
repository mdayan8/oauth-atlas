# Verification

Every fact in the six library guides was checked against the provider's official pages on 3 November 2026, or against a live endpoint where one exists. Below is each claim we started with, where we checked it, and what happened: Confirmed, Corrected (the earlier belief was wrong and the guide uses the corrected fact), or Could not verify (kept out of the main guide or marked Unverified).

## GitHub

| Claim | Source | Status | Note |
|---|---|---|---|
| Register an OAuth app in minutes, no GitHub review | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app | Confirmed | Form in Settings, Developer settings, OAuth apps. No review step on the page. |
| New orgs have OAuth app access restrictions on by default; owners approve requests | https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions | Confirmed | "When you create a new organization, OAuth app access restrictions are enabled by default." Users can request owner approval. |
| GitHub App needing org permissions must be approved by org owner | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps | Confirmed | Same page: GitHub recommends GitHub Apps (fine-grained, short-lived tokens). |
| Composio-managed OAuth available for GitHub | https://docs.composio.dev/toolkits/github.md | Confirmed | "Composio-managed OAuth available? Yes", scheme OAUTH2. GitHub Apps are bring-your-own. |
| Hosted MCP at api.githubcopilot.com/mcp supports DCR | https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp and https://github.com/.well-known/oauth-authorization-server/login/oauth | Corrected | No DCR. Origin /.well-known/oauth-authorization-server is 404. PRM points to github.com/login/oauth, whose metadata has no registration_endpoint. README: each MCP host must configure a GitHub App or OAuth App. skip.mcpDcr = no. |
| "Expire user access tokens" is on by default for new OAuth apps | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app | Confirmed | New finding, not in the brief. Differences page still says OAuth tokens are long-lived by default (older wording). |
| Expiring tokens: 8 h access, 6 months refresh; offline_access opt-in | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Confirmed | offline_access also listed in live AS metadata scopes_supported. |
| PKCE S256 supported, plain not | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Confirmed | Live AS metadata: code_challenge_methods_supported [S256]. |
| Auth code expires in 10 min; device code 15 min | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Confirmed | |
| 10 tokens per user/app/scope; 10 tokens per hour | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Confirmed | 11th revokes an older one; hourly cap triggers re-auth prompt. |
| Up to 100 OAuth apps per owner; up to 10 callback URLs | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app | Confirmed | |
| redirect_uri must match exactly (unless wildcard); loopback port may differ | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Confirmed | Recommends 127.0.0.1 or ::1 over localhost. |
| Device flow must be enabled, else device_flow_disabled | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Confirmed | |
| 5,000 req/h per user token; 15,000 for Enterprise Cloud owned/approved apps | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api | Confirmed | |
| Scope meanings (repo, public_repo, read:user, user:email, read:org, workflow) | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps | Confirmed | GitHub has no scope tiers or review; tiers in JSON are a risk label only. |
| Rate limits on /login/oauth endpoints | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Could not verify | Not stated. Listed in unverified. |
| SAML SSO orgs need token authorization | (not fetched) | Could not verify | Left out of main lists; listed in unverified. |

## Notion

| Claim | Source | Status | Note |
|---|---|---|---|
| Public integration, easy, no review to start OAuth | https://developers.notion.com/docs/authorization | Confirmed | "Marketplace submission or review is not required." Portal now calls these public connections. |
| Created in Developer portal: Build, Connections, Create new connection; Any workspace scope | https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview | Confirmed | Installation scope cannot be changed after creation. |
| Marketplace listing is optional, needs security review, reply in 5 to 10 business days | https://developers.notion.com/guides/connections-and-tokens/public-integrations/marketplace-listing | Confirmed | New detail, not in the brief. Only Any workspace connections can be listed. |
| Hosted MCP at mcp.notion.com supports DCR | https://mcp.notion.com/.well-known/oauth-authorization-server | Confirmed | Tested: registration_endpoint https://mcp.notion.com/register, S256, client_id_metadata_document_supported true. Server URL https://mcp.notion.com/mcp per get-started guide. |
| Composio-managed OAuth available for Notion | https://docs.composio.dev/toolkits/notion.md | Confirmed | "Composio-managed OAuth available? Yes". Schemes OAuth 2.0 and API key. |
| Token exchange at api.notion.com/v1/oauth/token with HTTP Basic; owner=user | https://developers.notion.com/docs/authorization | Confirmed | |
| Refresh tokens issued; refresh returns new access + refresh token | https://developers.notion.com/docs/authorization | Confirmed | |
| Page picker controls access; each user authorizes separately | https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview | Confirmed | |
| Capabilities list; changes force re-auth; fewer caps help admin install | https://developers.notion.com/reference/capabilities | Confirmed | Notion has no scope strings or review tiers; tiers in JSON are a risk label only. |
| Rate limit 180/min (3/s) most plans, 600/min Business and Enterprise, per connection | https://developers.notion.com/reference/request-limits | Confirmed | Data source query limit about 3/s. 429 with Retry-After. |
| Payload max 1000 blocks and 500KB; arrays 100 items | https://developers.notion.com/reference/request-limits | Confirmed | |
| Enterprise owners can restrict connections to an approved list | https://www.notion.com/help/add-and-manage-connections-with-the-api | Confirmed | Exact setting name not given; listed in unverified. |
| Access token lifetime | https://developers.notion.com/docs/authorization | Could not verify | Not stated. Listed in unverified. |
| PKCE for REST API OAuth | https://developers.notion.com/docs/authorization | Could not verify | Not mentioned (MCP server does support S256). Listed in unverified. |
| Workspace owner needed to create a public connection | https://developers.notion.com/docs/authorization | Could not verify | Stated only for internal connections. Left out of requirements; listed in unverified. |

## Slack

| Claim | Source | Status | Note |
|---|---|---|---|
| Single-workspace app needs no review | https://docs.slack.dev/distribution | Confirmed | Single workspace option, no review described. |
| Unlisted (public) distribution needs no review | https://docs.slack.dev/distribution | Could not verify | Implied, not stated. Docs describe review only for Marketplace. Activation needs a dashboard checklist (items not listed) and SSL on app URLs. Kept in `unverified`. |
| Marketplace needs 10+ active workspaces | https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide | Confirmed | Active = used in the past 28 days. |
| Marketplace needs a demo video | https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide | Confirmed | Must show install, OAuth, setup, use, uninstall. No code editors or terminals. |
| Marketplace review up to ~10 weeks | https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide | Corrected | Two stages: preliminary up to 10 business days, then functional up to 10 weeks (6 weeks for resubmitted changes). Slack cannot accelerate. |
| Privacy policy, public landing page, support contact (2 business day reply) | https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements | Confirmed | |
| search:read and other broad scopes should not be requested | https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide | Confirmed | Listed with identity.*, admin.*, client, read, post, triggers:*. |
| Non-Marketplace apps: conversations.history/replies 1 req/min, 15 objects | https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps | Confirmed | New for this guide (not in brief). From 29 May 2025 for new apps and new installs. Internal apps keep 50+/min, 1,000 objects. |
| Existing unlisted installs hit by the limit on a later date | https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps | Could not verify | Changelog says existing installs not impacted; a search summary mentioned 2 Sept 2025 from a FAQ I did not fetch. Left out. |
| chat.postMessage about 1 msg/sec per channel | https://docs.slack.dev/apis/web-api/rate-limits | Confirmed | |
| Redirect URL must be HTTPS; tokens do not expire unless rotation is on | https://docs.slack.dev/authentication/installing-with-oauth | Confirmed | |
| Hosted MCP at mcp.slack.com/mcp, no DCR, only internal or Marketplace apps | https://docs.slack.dev/ai/slack-mcp-server | Confirmed | "unlisted apps are prohibited from using MCP". |
| MCP authorization server metadata has no registration_endpoint | https://mcp.slack.com/.well-known/oauth-authorization-server | Confirmed (tested) | HTTP 200. Issuer https://mcp.slack.com, authorize slack.com/oauth/v2_user/authorize, token oauth.v2.user.access, PKCE S256, client_secret_post, 30 user scopes. Protected resource doc also 200. |
| Slack OIDC discovery | https://slack.com/.well-known/openid-configuration | Confirmed (tested) | HTTP 200. Issuer https://slack.com, scopes openid/profile/email, grant authorization_code only, no registration_endpoint. |
| Composio-managed OAuth available | https://docs.composio.dev/toolkits/slack.md | Confirmed | Managed app still pursuing Marketplace review; strict workspaces may need admin approval. |

## Gmail (Google)

| Claim | Source | Status | Note |
|---|---|---|---|
| gmail.send is a sensitive scope | https://developers.google.com/workspace/gmail/api/auth/scopes | Confirmed | Listed under Sensitive. |
| gmail.readonly is restricted | https://developers.google.com/workspace/gmail/api/auth/scopes | Confirmed | Listed under Restricted. |
| gmail.modify is restricted | https://developers.google.com/workspace/gmail/api/auth/scopes | Confirmed | Brief said "optionally modify"; it is restricted, same path as read. |
| gmail.labels needs review | https://developers.google.com/workspace/gmail/api/auth/scopes | Corrected | gmail.labels is non-sensitive, no verification needed. |
| gmail.compose and gmail.metadata | https://developers.google.com/workspace/gmail/api/auth/scopes | Confirmed | Both restricted. Worth flagging: compose is restricted while send is only sensitive. |
| Sensitive scope verification takes days to weeks | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | Corrected | Official wording: "can take up to 10 days". Brand verification 2 to 3 business days if branding changed. |
| Restricted scope verification + annual CASA | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | Confirmed | "Several weeks"; CASA "at least every 12 months" after LOA date; only if restricted data reachable from/through your servers. No cost stated. |
| CASA cost | https://leviathansecurity.com/programs/google-casa-cloud-application-security-assessment | Confirmed (third party) | CASA is now sold by Assurance Level: AL1 $3,000 / $4,500 / $6,000 by start speed; AL2 quote only. Badged third_party. |
| CASA cost (TAC Security $540 / $720 Tier 2) | https://tacsecurity.com/?p=18721 | Could not verify | Page returned 403. Left out; noted in unverified. |
| CASA duration | (none official) | Could not verify | No official or fetched third-party duration. Left out. |
| 100-user cap while unverified | https://support.google.com/cloud/answer/7454865 | Confirmed | "100 new users in total" until verified. Unclear if it ever resets. |
| 100 test user limit in Testing | https://support.google.com/cloud/answer/15549945 | Confirmed | Separate from the unverified cap above. Added as its own limit. |
| Refresh tokens expire after 7 days in Testing | https://developers.google.com/identity/protocols/oauth2 | Confirmed | Exception: only name/email/profile scopes. Also confirmed on the audience page. |
| 100 refresh tokens per account per client | https://developers.google.com/identity/protocols/oauth2 | Confirmed | Oldest silently invalidated; six-month inactivity expiry. |
| Internal user type avoids verification | https://support.google.com/cloud/answer/15549945 | Confirmed | Needs a Cloud organization; outsiders get org_internal. |
| Composio-managed OAuth for Gmail | https://docs.composio.dev/toolkits/gmail.md | Confirmed | "Composio-managed OAuth available? Yes". Shared quota; extra scopes can show "App is blocked". Last ~12k chars of page not read. |
| Google OIDC discovery | https://accounts.google.com/.well-known/openid-configuration | Confirmed (tested) | Fetched live. Auth /o/oauth2/v2/auth, token oauth2.googleapis.com/token, PKCE S256+plain, no registration_endpoint. |
| Google hosts a Gmail MCP server | https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server | Confirmed | Not in brief. https://gmailmcp.googleapis.com/mcp/v1, Developer Preview, bring your own OAuth client ID and secret. |
| Gmail MCP supports DCR | https://gmailmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1 | Confirmed no (tested) | PRM points to accounts.google.com. gmailmcp.googleapis.com/.well-known/oauth-authorization-server is 404; accounts.google.com/.well-known/oauth-authorization-server has no registration_endpoint. skip.mcpDcr = no. |
| Finer Gmail scopes (gmail.send.self, gmail.messages.readonly, etc.) | https://gmailmcp.googleapis.com/.well-known/oauth-protected-resource/mcp/v1 | Could not verify | Appear in MCP metadata but not in the public scope table; tiers unknown. Kept out of scopes list. |

## Spotify

| Claim | Source | Status | Note |
|---|---|---|---|
| Not Composio-managed | https://docs.composio.dev/toolkits/spotify.md | Confirmed | "Composio-managed OAuth available? No"; must create your own app. |
| Dev mode user cap was 25, now 5 | https://developer.spotify.com/documentation/web-api/concepts/quota-modes | Confirmed | "Up to 5 authenticated Spotify users". New Client IDs from 11 Feb 2026, existing apps from 9 Mar 2026 (blog). |
| Existing apps lose users over 5 | https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide | Corrected | Migration guide: existing apps keep extra users already added; limits only restrict adding more. |
| App owner needs Premium in dev mode | https://developer.spotify.com/documentation/web-api/concepts/quota-modes | Confirmed | Also: app stops working if Premium lapses, resumes on resubscribe (migration guide). |
| One Development Mode Client ID per developer | https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security | Corrected | Was 1 in Feb 2026; migration guide says raised to 25 as of July 2026. Not in brief. |
| Dev mode endpoint restrictions | https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide | Confirmed | Batch fetches, browse, artist top tracks, other users' profiles removed; search limit max 10. Blog says this was postponed for existing integrations. |
| Extended quota only for organisations | https://developer.spotify.com/documentation/web-api/concepts/quota-modes | Confirmed | Since 15 May 2025. Partner Application from company email first. |
| 250k+ MAU | https://developer.spotify.com/documentation/web-api/concepts/quota-modes | Confirmed | "at least 250k MAUs", plus launched service, key markets, commercial viability. |
| Review up to 6 weeks | https://developer.spotify.com/documentation/web-api/concepts/quota-modes | Confirmed | "can take up to six weeks". |
| Redirect URI rules | https://developer.spotify.com/documentation/web-api/concepts/redirect_uri | Confirmed | Not in brief. HTTPS required except loopback IP; "localhost" not allowed. |
| Implicit grant deprecated; PKCE for apps without a secret | https://developer.spotify.com/documentation/web-api/concepts/authorization | Confirmed | Implicit grant marked Deprecated in sidebar; no date on page. |
| Rate limits | https://developer.spotify.com/documentation/web-api/concepts/rate-limits | Confirmed | Rolling 30 s window, 429 with Retry-After; lower in dev mode. No numbers published. |
| No AI training on Spotify content | https://developer.spotify.com/policy | Confirmed | Not in brief. Section III bans training or ingesting Spotify content into ML/AI models; commercial use limited. |
| No scope tiers | https://developer.spotify.com/documentation/web-api/concepts/scopes | Confirmed | No scope needs review; all marked basic. |
| No DCR / no official MCP | https://accounts.spotify.com/.well-known/oauth-authorization-server | Confirmed (tested) | Fetched live: no registration_endpoint. Search found only third-party Spotify MCP servers. skip.mcpDcr = no. |
| Allowlist details (where, which fields) | https://developer.spotify.com/documentation/web-api/concepts/apps | Could not verify | Apps page does not describe User Management. Kept wording generic. |

## Shopify

| Claim | Source | Status | Note |
|---|---|---|---|
| Distribution method choice is irreversible | https://shopify.dev/docs/apps/launch/distribution | Confirmed | "You can't change the distribution method after you select it." Also on select-distribution-method page. |
| Custom apps: one store, one Plus org, or dev stores; no approval | https://shopify.dev/docs/apps/launch/distribution | Confirmed | Custom apps cannot use Shopify billing. |
| Admin-created custom apps | https://shopify.dev/docs/apps/launch/distribution | Confirmed | New finding: can no longer be created; existing ones keep working. |
| Public apps need App Store review | https://shopify.dev/docs/apps/launch/app-store-review/review-process | Confirmed | Draft, Submitted, Paused, Reviewed, Published. |
| App Store review duration | https://shopify.dev/docs/apps/launch/app-store-review/review-process | Could not verify | No duration on official pages. Verdict waiting says "Not published by Shopify". |
| Partner account needed | https://shopify.dev/docs/apps/launch/distribution/select-distribution-method | Corrected | Distribution card only appears for apps in a Partner organization (Dev Dashboard). Whether the account is free not confirmed. |
| $19 one-time App Store registration fee | https://shopify.dev/docs/apps/launch/distribution/revenue-share | Confirmed | Per Partner account; not needed for custom apps for a single merchant. Distribution page says "one-time fee" without amount. |
| Screencast, test credentials, privacy policy, Shopify billing, OAuth right after install | https://shopify.dev/docs/apps/launch/app-requirements-checklist | Confirmed | Also https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review |
| Mandatory compliance webhooks for App Store apps | https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance | Confirmed | customers/data_request, customers/redact, shop/redact; 401 on bad HMAC; 30 days to act. |
| Protected customer data review for public apps | https://shopify.dev/docs/apps/launch/protected-customer-data | Confirmed | Level 1 / level 2 (name, address, email, phone). Dev-store-only apps need no review. Unapproved fields redacted. |
| read_orders covers 60 days; read_all_orders needs approval | https://shopify.dev/docs/api/usage/access-scopes | Confirmed | Merchant-org Dev Dashboard apps don't need approval for read_all_orders. |
| New public apps must use expiring offline tokens | https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant | Confirmed | Client credentials grant recommended for apps acting only on your own org. |
| Composio-managed OAuth | https://docs.composio.dev/toolkits/shopify.md | Confirmed: not available | Schemes OAUTH2, S2S_OAUTH2. |
| Hosted MCP + DCR | https://shopify.dev/docs/apps/build/customer-accounts-mcp | Confirmed: no DCR | Customer Accounts MCP is shopper-facing; app ID is client_id. Tested https://allbirds.com/.well-known/oauth-authorization-server: HTTP 200, no registration_endpoint. No hosted Admin API MCP found (could not verify absence). |
