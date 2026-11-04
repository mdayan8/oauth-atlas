import type { Guide } from "@/lib/schema";
import type { Resolved, Situation } from "@/lib/situation";
import { ACTOR_LABEL, DIFFICULTY_LABEL, situationLine } from "@/lib/share";
import { Recheck } from "../AgentActions";
import { DIFF_COLOR, Meter, Pill, Skeleton } from "../ui";
import { ACTOR_COLOR, plural, type CiteFn } from "./shared";

// The brief's four questions, answered in plain words before any detail.
export default function QuickAnswer({ g, r, s, live, Cite, style }: { g: Guide; r: Resolved; s: Situation; live: boolean; Cite: CiteFn; style: React.CSSProperties }) {
  const v = r.verdict;
  const time = (x: string) => (/^not published$/i.test(x.trim()) ? "No estimate published" : x);
  const counts = { agent: 0, you: 0, provider: 0 };
  r.steps.forEach((x) => counts[x.actor]++);
  const name = g.name || "this app";
  const skip =
    g.skip.composioManaged === "yes"
      ? `Quickest path: Composio already manages ${name}, so you can skip all of this. Register your own app only if you want your own branding, permissions or quota.`
      : g.skip.mcpDcr === "yes"
        ? `Quickest path: ${name}'s MCP server signs agents up automatically, so MCP users can skip this.`
        : g.skip.composioManaged === "no"
          ? `There is no shortcut: you need your own ${name} OAuth app.`
          : "";
  const tile = "rounded-xl bg-row p-5";
  const head = "label !text-[11px] text-ink-3";

  return (
    <section className="rounded-2xl bg-card p-1.5" aria-live="polite" aria-label="Quick answer" style={style}>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className={tile}>
          <p className={head}>How hard</p>
          {v ? (
            <>
              <p className="mt-2 text-[36px] leading-none tracking-[-0.9px] transition-colors duration-500" style={{ color: DIFF_COLOR[v.difficulty] }}>
                {DIFFICULTY_LABEL[v.difficulty]}
              </p>
              <div className="mt-4">
                <Meter d={v.difficulty} />
              </div>
              <a href="#paths" className="label mt-3 block !text-[10px] text-ink-3 hover:text-ink">
                For: {situationLine(g, s)} · change
              </a>
            </>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
        <div className={tile}>
          <p className={head}>How long</p>
          {v ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-[16px] leading-snug">
                <span className="label block !text-[10px] text-ink-3">Your time</span>
                {time(v.handsOn)}
              </p>
              <p className="text-[16px] leading-snug">
                <span className="label block !text-[10px] text-ink-3">Waiting on {name}</span>
                {time(v.waiting)}
              </p>
            </div>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
        <div className={tile}>
          <p className={head}>What you need</p>
          {r.requirements.length ? (
            <ul className="mt-2 flex flex-col gap-1 text-[14px]">
              {r.requirements.slice(0, 3).map((x) => (
                <li key={x.id} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span className="min-w-0">{x.label}</span>
                </li>
              ))}
              {r.requirements.length > 3 && (
                <li>
                  <a href="#path" className="text-[13px] text-ink-3 hover:text-accent">
                    +{r.requirements.length - 3} more in your path
                  </a>
                </li>
              )}
            </ul>
          ) : live ? (
            <Skeleton bare tall />
          ) : (
            <p className="mt-2 text-[14px] text-ink-2">Just a developer account.</p>
          )}
        </div>
        <div className={tile}>
          <p className={head}>Who does what</p>
          {r.steps.length ? (
            <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
              {(["agent", "you", "provider"] as const)
                .filter((k) => counts[k] > 0)
                .map((k) => (
                  <li key={k} className="flex items-center justify-between gap-2">
                    <Pill color={ACTOR_COLOR[k]}>{ACTOR_LABEL[k]}</Pill>
                    <span>{plural(counts[k], "step")}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <Skeleton bare tall={live} />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        {skip && (
          <div className="rounded-xl px-4 py-3" style={{ background: `color-mix(in srgb, ${g.skip.composioManaged === "yes" || g.skip.mcpDcr === "yes" ? "var(--d-instant)" : "var(--ink-3)"} 8%, var(--row))` }}>
            <p className="label !text-[10px]" style={{ color: g.skip.composioManaged === "yes" || g.skip.mcpDcr === "yes" ? "var(--d-instant)" : "var(--ink-3)" }}>
              {g.skip.composioManaged === "yes" || g.skip.mcpDcr === "yes" ? "Quickest path" : "No shortcut"}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed">
              {skip.replace(/^Quickest path: /, "")} {g.skip.sourceIds.length > 0 && <Cite ids={g.skip.sourceIds} />}
            </p>
          </div>
        )}
        {v?.why && (
          <p className="text-[14px] leading-relaxed text-ink-2">
            {v.why} <Cite ids={v.sourceIds} />
          </p>
        )}
        {!g.generated && !live && <Recheck slug={g.slug} />}
      </div>
    </section>
  );
}
