import type { Guide, LinkT } from "@/lib/schema";

export function LinkButton({ l, main = false }: { l: LinkT; main?: boolean }) {
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noreferrer"
      className={`label inline-flex h-9 items-center gap-2 rounded-[4px] px-3.5 transition-colors ${main ? "bg-accent text-on-accent hover:opacity-90" : "bg-card text-ink hover:text-accent"}`}
    >
      {l.label} ↗
    </a>
  );
}

// The page where a step or requirement actually happens, picked from the guide's verified links. A link whose own
// label names the thing (scopes, redirect, consent screen, Search Console) wins; otherwise the kind of page that
// kind of work happens on.
export function linkFor(g: Guide, text: string, actor: "agent" | "you" | "provider"): LinkT | undefined {
  const t = text.toLowerCase();
  const by = (...kinds: LinkT["kind"][]) => kinds.map((k) => g.links.find((l) => l.kind === k)).find(Boolean);
  const topics = ["scope", "redirect", "callback", "consent", "privacy", "search console", "domain", "verif", "review", "billing", "webhook", "marketplace", "distribution", "install"];
  for (const topic of topics)
    if (t.includes(topic)) {
      const hit = g.links.find((l) => `${l.label} ${l.note ?? ""} ${l.url}`.toLowerCase().includes(topic));
      if (hit) return hit;
    }
  if (actor === "provider" || /submit|review|verif|publish|listing|marketplace|quota/.test(t)) return by("review", "console");
  if (/account|organization|organisation|workspace|partner|tenant|create|register|new app|set up|client id|credential|consent screen|dashboard|enable/.test(t)) return by("register", "console");
  if (/install|test|manage|settings|store|distribution|redirect|callback|scope/.test(t)) return by("console", "register");
  return by("docs");
}

export const stepPrompt = (g: Guide, title: string, detail: string) =>
  [
    `Do this step for my ${g.name} OAuth integration: ${title}.`,
    detail,
    "Read the client id and secret from environment variables, never hard-code them.",
    "Check what you rely on against these sources first:",
    ...g.sources.filter((s) => s.badge !== "unverified").slice(0, 6).map((s) => `- ${s.url}`),
    "If a source does not say it, tell me it is unverified instead of guessing.",
  ].join("\n");
