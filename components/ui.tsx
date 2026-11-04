import type { BadgeT, Difficulty } from "@/lib/schema";
import { BADGE_LABEL, DIFFICULTY_LABEL } from "@/lib/share";
import { difficultyIndex } from "@/lib/situation";

export const DIFF_COLOR: Record<Difficulty, string> = {
  instant: "var(--d-instant)",
  easy: "var(--d-easy)",
  moderate: "var(--d-moderate)",
  hard: "var(--d-hard)",
  gated: "var(--d-gated)",
};

export const BADGE_COLOR: Record<BadgeT, string> = {
  tested: "var(--b-tested)",
  official: "var(--b-official)",
  third_party: "var(--b-third)",
  unverified: "var(--b-unverified)",
};

export function Pill({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="label inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5"
      style={{ color, background: `color-mix(in srgb, ${color} 11%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export function EvidenceBadge({ badge }: { badge: BadgeT }) {
  return <Pill color={BADGE_COLOR[badge]}>{BADGE_LABEL[badge]}</Pill>;
}

export function DifficultyPill({ d }: { d: Difficulty }) {
  return <Pill color={DIFF_COLOR[d]}>{DIFFICULTY_LABEL[d]}</Pill>;
}

export function Meter({ d }: { d: Difficulty }) {
  const i = difficultyIndex(d);
  return (
    <div role="img" aria-label={`Difficulty ${DIFFICULTY_LABEL[d]}, ${i + 1} of 5`}>
      <div className="flex gap-1">
      {(["instant", "easy", "moderate", "hard", "gated"] as const).map((k, j) => (
        <div key={k} className="h-1.5 flex-1 rounded-full transition-colors duration-500" style={{ background: j <= i ? DIFF_COLOR[d] : "var(--line)" }} />
      ))}
      </div>
    </div>
  );
}

export function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-row px-4 py-3.5 ${className}`}>{children}</div>;
}

// Placeholder bars while the live agent is still looking.
export function Skeleton({ bare = false, tall = false }: { bare?: boolean; tall?: boolean }) {
  const bars = (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <div className="shimmer h-3 w-3/5 rounded-full" />
      <div className="shimmer h-3 w-11/12 rounded-full" />
      {tall && <div className="shimmer h-3 w-2/5 rounded-full" />}
    </div>
  );
  return bare ? <div className="mt-3">{bars}</div> : <div className="rounded-xl bg-row px-4 py-4">{bars}</div>;
}
