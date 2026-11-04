import Library, { type Card } from "@/components/Library";
import { GUIDES } from "@/lib/guides";
import { defaultSituation, difficultyIndex, pickVerdict } from "@/lib/situation";

const POINTS = [
  ["Answer first, then one step at a time", "How hard, how long, what you need and who does what, shaped to your situation. Then a path where only your next step is open."],
  ["The agent does its part", "Privacy policy, scope justification, demo video script: anything marked Agent can draft, it writes for you on the spot."],
  ["Proof you can re-run", "Every claim shows its evidence. Re-check live fetches the tested endpoints again, in front of you, with no key needed."],
];

export default function Home() {
  const cards: Card[] = GUIDES.map((g) => {
    const sorted = [...g.verdicts].sort((a, b) => difficultyIndex(a.difficulty) - difficultyIndex(b.difficulty));
    const base = g.verdicts.find((v) => !v.when) ?? sorted[0];
    return {
      slug: g.slug,
      name: g.name,
      domain: g.domain,
      summary: g.summary,
      min: sorted[0].difficulty,
      max: sorted.at(-1)!.difficulty,
      handsOn: base.handsOn,
      waiting: base.waiting,
      managed: g.skip.composioManaged,
      sources: g.sources.length,
      // Each real route through setup with the verdict it gets: the "same app, different answer" preview.
      routes: g.paths.flatMap((p) => {
        const base = defaultSituation(g);
        const v = pickVerdict(g.verdicts, { ...base, ...p.set, needs: p.set.needs ?? base.needs });
        return v ? [{ label: p.label, difficulty: v.difficulty, handsOn: v.handsOn, waiting: v.waiting }] : [];
      }),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="pt-14 sm:pt-20">
        <Library
          cards={cards}
          hero={
            <>
              <p className="label inline-flex items-center gap-2 rounded-full bg-row/70 px-3 py-1.5 text-accent ring-1 ring-[var(--line)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                OAuth app guides for agent builders
              </p>
              <h1 className="mt-6 text-[40px] leading-[1.05] tracking-[-1.2px] sm:text-[60px] sm:tracking-[-2px]">
                Know how hard an OAuth app is <br className="hidden sm:block" />
                <span className="text-ink-3">before you start.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
                Your users want to click &ldquo;Connect Gmail&rdquo;. Before that works you may need your own OAuth app and a review that takes
                an hour or months. Get the difficulty, your time versus waiting time, what you need, and what an agent can do for you.
              </p>
            </>
          }
        />
      </div>

      <section className="mt-24 grid gap-3 sm:grid-cols-3">
        {POINTS.map(([t, d], i) => (
          <div key={t} className="rounded-2xl bg-card p-6">
            <p className="label text-accent">0{i + 1}</p>
            <p className="mt-3 text-[18px]">{t}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
