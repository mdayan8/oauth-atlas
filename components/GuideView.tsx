"use client";

import { useCallback, useEffect, useState } from "react";
import type { Guide } from "@/lib/schema";
import { applyPreset, defaultSituation, resolve, type Situation } from "@/lib/situation";
import AskPanel from "./AskPanel";
import BeforeLaunch from "./guide/BeforeLaunch";
import Header from "./guide/Header";
import Path from "./guide/Path";
import PathChooser from "./guide/PathChooser";
import QuickAnswer from "./guide/QuickAnswer";
import ShareBar from "./guide/ShareBar";
import Sources from "./guide/Sources";
import Stuck from "./guide/Stuck";
import WhereToGo from "./guide/WhereToGo";
import { Cite as SourceCite, type CiteFn } from "./guide/shared";

// Each block fades in a beat after the one before, so the guide visibly assembles itself.
const beat = (i: number) => ({ "--d": `${i * 90}ms` }) as React.CSSProperties;

// Owns the reader's situation and composes the sections. Each section is its own file under components/guide.
export default function GuideView({
  guide: g,
  live = false,
  shareLink,
}: {
  guide: Guide;
  live?: boolean;
  shareLink?: () => Promise<string>;
}) {
  const [s, setS] = useState<Situation>(() => defaultSituation(g));
  // Live guides discover their needs while streaming: keep defaults in sync until the reader touches them.
  const [touched, setTouched] = useState(false);
  const sit = touched ? s : defaultSituation(g);
  const r = resolve(g, sit);
  const set = (p: Partial<Situation>) => {
    setTouched(true);
    setS({ ...sit, ...p });
  };
  // Stable so the Ask panel's effect does not re-run on every render.
  // The closest path (a hand-authored preset) is applied first, then whatever the model read directly.
  const onSituation = useCallback(
    (p: Parameters<typeof applyPreset>[1] & { path?: string | null }) => {
      setTouched(true);
      const preset = g.paths.find((x) => x.id === p.path)?.set ?? {};
      setS((cur) => applyPreset(applyPreset(cur, preset), p));
    },
    [g.paths],
  );
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const Cite: CiteFn = ({ ids }) => <SourceCite ids={ids} sources={g.sources} />;

  return (
    <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${live ? "live" : ""} ${settled ? "settled" : ""}`}>
      <Header g={g} r={r} s={sit} live={live} shareLink={shareLink} />

      <div className="build flex flex-col gap-4">
        <QuickAnswer g={g} r={r} s={sit} live={live} Cite={Cite} style={beat(0)} />
        {!live && (
          <div className="lg:hidden" style={beat(1)}>
            <ShareBar g={g} r={r} s={sit} shareLink={shareLink} />
          </div>
        )}
        {!live && g.name && (
          <div style={beat(1)}>
            <AskPanel g={g} Cite={Cite} onSituation={onSituation} />
          </div>
        )}
        <PathChooser g={g} sit={sit} r={r} set={set} style={beat(1)} />
        <div style={beat(2)}>
          <Path g={g} r={r} sit={sit} live={live} Cite={Cite} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:items-start" style={beat(3)}>
          <WhereToGo g={g} live={live} />
          <Stuck r={r} live={live} Cite={Cite} />
        </div>
        <BeforeLaunch r={r} live={live} Cite={Cite} style={beat(5)} />
        <Sources g={g} style={beat(6)} />
      </div>
    </div>
  );
}
