"use client";

import { useState } from "react";

// The app's logo, or its first letter when no image answers.
export default function AppLogo({ src, name, size = 24, className = "" }: { src: string; name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  if (!src || broken)
    return (
      <span className={`grid shrink-0 place-items-center rounded-md bg-ink font-medium text-bg ${className}`} style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden>
        {letter}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} onError={() => setBroken(true)} className={`shrink-0 rounded-md object-contain ${className}`} style={{ width: size, height: size }} />;
}
