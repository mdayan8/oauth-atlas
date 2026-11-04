import type { Guide } from "@/lib/schema";
import { claimBadge } from "@/lib/situation";
import { BADGE_LABEL } from "@/lib/share";
import { BADGE_COLOR } from "../ui";

export type CiteFn = (p: { ids?: string[] }) => React.ReactNode;

export const ACTOR_COLOR = { agent: "var(--accent)", you: "var(--ink)", provider: "var(--d-moderate)" };

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// Source numbers like [3] with a dot for how well the claim is backed. Clicking one opens the Sources list.
export function Cite({ ids, sources }: { ids?: string[]; sources: Guide["sources"] }) {
  const nums = (ids ?? []).map((id) => sources.findIndex((x) => x.id === id) + 1).filter((n) => n > 0);
  const badge = claimBadge(ids, sources);
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle" title={BADGE_LABEL[badge]}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BADGE_COLOR[badge] }} aria-label={BADGE_LABEL[badge]} />
      {nums.map((n) => (
        <a
          key={n}
          href={`#src-${n}`}
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("atlas:source", { detail: n }));
          }}
          className="label !text-[11px] text-ink-3 underline-offset-2 hover:text-accent hover:underline"
        >
          [{n}]
        </a>
      ))}
    </span>
  );
}
