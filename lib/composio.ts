import type { Guide } from "./schema";

// Composio's toolkit slug for this app: library slugs are Composio slugs; live guides carry the one the check found.
export const toolkitSlug = (g: Pick<Guide, "slug" | "skip">) => g.skip.composioSlug ?? g.slug;
export const toolkitUrl = (g: Pick<Guide, "slug" | "skip">) => `https://docs.composio.dev/toolkits/${toolkitSlug(g)}`;
export const COMPOSIO_DASHBOARD = "https://platform.composio.dev/";
export const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";

// Composio's logo service knows every toolkit; any other app falls back to its site's favicon.
export const logoSrc = (g: { domain?: string; skip?: { composioManaged?: string; composioSlug?: string | null }; slug?: string }) =>
  g.skip && g.skip.composioManaged !== "unknown" && (g.skip.composioSlug || g.slug)
    ? `https://logos.composio.dev/api/${g.skip.composioSlug ?? g.slug}`
    : g.domain
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(g.domain)}&sz=64`
      : "";
