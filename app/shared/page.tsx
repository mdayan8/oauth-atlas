"use client";

import { useEffect, useState } from "react";
import GuideView from "@/components/GuideView";
import { Guide } from "@/lib/schema";
import { unpack } from "@/lib/pack";

export default function Shared() {
  const [g, setG] = useState<Guide | null>(null);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    const data = location.hash.slice(1);
    if (!data) return setBad(true);
    unpack(data)
      .then((x) => setG(Guide.parse(x)))
      .catch(() => setBad(true));
  }, []);
  if (bad)
    return (
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h1 className="h-display">This link is incomplete</h1>
        <p className="mt-4 text-ink-2">The guide data in the link could not be read. Ask for the link again, or generate a fresh guide.</p>
      </div>
    );
  if (!g) return <div className="label mx-auto max-w-6xl px-4 pt-16 text-ink-3 sm:px-6">Opening guide...</div>;
  return <GuideView guide={g} shareLink={async () => location.href} />;
}
