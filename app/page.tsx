import Library, { type Card } from "@/components/Library";
import { GUIDES } from "@/lib/guides";
import { applyPreset, defaultSituation, difficultyIndex, pickVerdict } from "@/lib/situation";

const POINTS = [
  ["Answer first", "A verdict for your situation, then one open step at a time."],
  ["The agent does its part", "Privacy policy, scope justification, demo script: drafted for you."],
  ["Proof you can re-run", "Every claim cites a source. Re-check hits the endpoints again."],
];

export default function Home() {
  const cards: Card[] = GUIDES.map((g) => {
    const sorted = [...g.verdicts].sort((a, b) => difficultyIndex(a.difficulty) - difficultyIndex(b.difficulty));
    return {
      slug: g.slug,
      name: g.name,
      domain: g.domain,
      summary: g.summary,
      min: sorted[0].difficulty,
      max: sorted.at(-1)!.difficulty,
      // Each real route through setup with the verdict it gets: the "same app, different answer" preview.
      routes: g.paths.flatMap((p) => {
        const base = defaultSituation(g);
        const v = pickVerdict(g.verdicts, applyPreset(base, p.set));
        return v ? [{ label: p.label, difficulty: v.difficulty, handsOn: v.handsOn, waiting: v.waiting }] : [];
      }),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="pt-8 sm:pt-12">
        <Library
          cards={cards}
          hero={
            <>
              <h1 className="h-display mx-auto max-w-[820px] [text-wrap:balance]">
                Know how hard an OAuth app is, <span className="text-ink-3">before&nbsp;you&nbsp;start.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2">How hard, how long, what you need. Every line cites a source.</p>
            </>
          }
        />
      </div>

      <section className="mt-24 grid gap-4 sm:grid-cols-3">
        {POINTS.map(([t, d], i) => (
          <div key={t} className="rounded-xl border border-line p-4">
            <p className="label text-accent">0{i + 1}</p>
            <p className="mt-2 text-[16px]">{t}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
