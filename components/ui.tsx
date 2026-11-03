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

const BADGE_COLOR: Record<BadgeT, string> = {
  tested: "var(--b-tested)",
  official: "var(--b-official)",
  third_party: "var(--b-third)",
  unverified: "var(--b-unverified)",
};

export function Pill({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="label inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 !text-[11px]"
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
    <div className="flex gap-1" role="img" aria-label={`Difficulty ${DIFFICULTY_LABEL[d]}, ${i + 1} of 5`}>
      {(["instant", "easy", "moderate", "hard", "gated"] as const).map((k, j) => (
        <div key={k} className="flex-1">
          <div
            className="h-1.5 rounded-full transition-colors duration-500"
            style={{ background: j <= i ? DIFF_COLOR[d] : "var(--line)" }}
          />
          <div className={`label mt-2 !text-[10px] ${j === i ? "text-ink" : "text-ink-3"}`}>{DIFFICULTY_LABEL[k]}</div>
        </div>
      ))}
    </div>
  );
}

export function Section({
  id,
  title,
  count,
  aside,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-card p-1.5">
      <div className="flex flex-wrap items-center gap-3 px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">{title}</h2>
        {count !== undefined && <span className="label text-ink-3">{count}</span>}
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

export function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rise rounded-xl bg-row px-4 py-3.5 ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-row px-4 py-3.5 text-[14px] text-ink-3">{children}</div>;
}
