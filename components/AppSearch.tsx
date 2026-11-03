"use client";

import { useState } from "react";

export default function AppSearch({
  initial = "",
  compact = false,
  onSubmit,
  onChange,
}: {
  initial?: string;
  compact?: boolean;
  onSubmit: (v: string) => void;
  onChange?: (v: string) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit(v.trim());
      }}
      className={`flex w-full flex-col gap-2 sm:flex-row ${compact ? "" : "sm:gap-0"}`}
    >
      <label htmlFor="app" className="sr-only">
        App name or website
      </label>
      <input
        id="app"
        value={v}
        maxLength={120}
        onChange={(e) => {
          setV(e.target.value);
          onChange?.(e.target.value);
        }}
        placeholder="Salesforce, linear.app, Zoom..."
        autoComplete="off"
        className={`w-full min-w-0 bg-row px-4 sm:flex-1 text-[16px] text-ink placeholder:text-ink-3 outline-none ring-1 ring-line focus:ring-2 focus:ring-accent ${
          compact ? "h-11" : "h-14 sm:text-[18px]"
        }`}
      />
      <button
        type="submit"
        className={`label shrink-0 bg-accent px-6 text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40 ${compact ? "h-11" : "h-14"}`}
        disabled={!v.trim()}
      >
        Generate guide
      </button>
    </form>
  );
}
