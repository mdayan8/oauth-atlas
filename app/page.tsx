import Library, { type Card } from "@/components/Library";
import { GUIDES } from "@/lib/guides";
import { difficultyIndex } from "@/lib/situation";

const POINTS = [
  ["Can you skip it?", "First we check if Composio already manages the app, or if the provider's MCP server registers clients for you."],
  ["Shaped to you", "Pick who you are, who will connect, and what your agent needs. Difficulty, steps and time update instantly."],
  ["Every claim sourced", "Each line carries its evidence: tested by the agent, official docs, third-party, or unverified."],
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
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="pt-16 sm:pt-24">
        <p className="label text-accent">OAuth app guides for agent builders</p>
        <h1 className="h-display mt-5 max-w-3xl">Know how hard an OAuth app is before you start.</h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-ink-2">
          Your users want to click &ldquo;Connect Gmail&rdquo;. Before that works you may need your own OAuth app and a review that takes
          an hour or months. Look up any app to see the difficulty, your time versus waiting time, what you need, and what an agent
          can do for you.
        </p>
        <Library cards={cards} />
      </div>

      <section className="mt-20 grid gap-3 sm:grid-cols-3">
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
