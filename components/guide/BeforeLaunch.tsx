import type { Resolved } from "@/lib/situation";
import { Pill, Skeleton } from "../ui";
import type { CiteFn } from "./shared";

// Limits and permissions: what to design around before you launch.
export default function BeforeLaunch({ r, live, Cite, style }: { r: Resolved; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
  if (!r.limits.length && !r.scopes.length && !live) return null;
  const tierColor = (t: string) => (t === "restricted" ? "var(--d-gated)" : t === "sensitive" ? "var(--d-moderate)" : "var(--d-instant)");
  return (
    <section className="rounded-xl border border-line bg-bg p-2" style={style} aria-label="Before you launch">
      <div className="px-3.5 pb-3 pt-3">
        <h2 className="label text-ink">Before you launch</h2>
        <p className="mt-1 text-[13px] text-ink-3"></p>
      </div>
      <div className="rows grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {r.limits.length === 0 && live && <Skeleton />}
        {r.limits.map((x) => (
          <div key={x.id} className="rounded-xl bg-row p-4">
            <p className="text-[15px] font-medium">{x.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{x.detail}</p>
            <div className="mt-2">
              <Cite ids={x.sourceIds} />
            </div>
          </div>
        ))}
      </div>
      {r.scopes.length > 0 && (
        <div className="mt-1.5 rounded-xl bg-row p-4">
          <p className="label text-ink-3">Scopes · sensitive and restricted ones trigger a review</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {r.scopes.map((x) => (
              <li key={x.name} className="grid gap-1 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <code className="whitespace-nowrap font-mono text-[12px]">{x.name}</code>
                <span className="text-[13px] text-ink-2">{x.meaning}</span>
                <span className="flex gap-1.5">
                  <Pill color={tierColor(x.tier)}>{x.tier}</Pill>
                  {x.triggersReview && <Pill color="var(--d-hard)">Review</Pill>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
