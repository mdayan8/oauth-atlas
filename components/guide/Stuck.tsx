import type { Resolved } from "@/lib/situation";
import { Skeleton } from "../ui";
import type { CiteFn } from "./shared";

export default function Stuck({ r, live, Cite }: { r: Resolved; live: boolean; Cite: CiteFn }) {
  if (!r.blockers.length && !live) return null;
  return (
    <section className="rounded-2xl bg-card p-1.5" aria-label="If you get stuck">
      <h2 className="label px-3.5 pb-3 pt-3 text-ink">If you get stuck</h2>
      <div className="rounded-xl bg-row p-1.5">
        {r.blockers.length === 0 && <Skeleton bare tall />}
        <div className="rows flex flex-col">
          {r.blockers.map((x) => (
            <details key={x.id} className="group rounded-lg px-2.5 py-2.5 open:bg-card">
              <summary className="flex cursor-pointer list-none items-start gap-2.5 text-[14px]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--d-hard)" }} />
                <span className="min-w-0 flex-1 break-words">{x.symptom}</span>
                <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 pl-4 text-[14px] leading-relaxed text-ink-2">{x.fix}</p>
              <div className="mt-2 pl-4">
                <Cite ids={x.sourceIds} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
