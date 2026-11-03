import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pill } from "@/components/ui";

export const metadata = { title: "Evidence check · OAuth Atlas" };

const STATUS_COLOR: Record<string, string> = {
  Confirmed: "var(--d-instant)",
  Corrected: "var(--d-moderate)",
  "Could not verify": "var(--d-gated)",
};

// VERIFICATION.md is the single source: this page renders its tables at build time.
function parse() {
  const md = readFileSync(join(process.cwd(), "VERIFICATION.md"), "utf8");
  const groups: { app: string; rows: string[][] }[] = [];
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) groups.push({ app: line.slice(3).trim(), rows: [] });
    else if (line.startsWith("|") && !/^\|\s*-/.test(line) && !/^\|\s*Claim/i.test(line) && groups.length) {
      groups.at(-1)!.rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
    }
  }
  const intro = md.split("\n## ")[0].split("\n").filter((l) => l && !l.startsWith("#")).join(" ");
  return { groups: groups.filter((g) => g.rows.length), intro };
}

const base = (status: string) => Object.keys(STATUS_COLOR).find((k) => status.startsWith(k)) ?? status;
const link = (cell: string) => cell.match(/\((https?:[^)]+)\)/)?.[1] ?? (cell.startsWith("http") ? cell : undefined);

export default function Verification() {
  const { groups, intro } = parse();
  const all = groups.flatMap((g) => g.rows);
  const count = (s: string) => all.filter((r) => base(r[2]) === s).length;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="pt-16 sm:pt-20">
        <p className="label text-accent">Evidence check</p>
        <h1 className="h-display mt-5 max-w-3xl">What we checked, what we fixed, what we could not confirm.</h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-ink-2">{intro}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {Object.keys(STATUS_COLOR).map((s) => (
            <span key={s} className="rounded-xl bg-card px-4 py-3">
              <span className="text-[24px]">{count(s)}</span>
              <span className="label ml-2 text-ink-3">{s}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-12 flex flex-col gap-4">
        {groups.map((g) => (
          <section key={g.app} className="rounded-2xl bg-card p-1.5">
            <h2 className="label px-3.5 pb-3 pt-3 text-ink">{g.app}</h2>
            <div className="flex flex-col gap-1">
              {g.rows.map(([claim, source, status, note], i) => (
                <div key={i} className="grid gap-2 rounded-xl bg-row px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
                  <div className="min-w-0">
                    <p className="text-[15px]">{claim}</p>
                    {note && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{note}</p>}
                    {link(source) && (
                      <a href={link(source)} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono text-[12px] text-ink-3 hover:text-accent">
                        {link(source)}
                      </a>
                    )}
                  </div>
                  <span>
                    <Pill color={STATUS_COLOR[base(status)] ?? "var(--ink-3)"}>{status}</Pill>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
