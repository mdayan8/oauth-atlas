import type { Guide } from "@/lib/schema";
import type { Resolved, Situation } from "@/lib/situation";
import ShareBar from "./ShareBar";
import AppLogo from "../AppLogo";
import { logoSrc } from "@/lib/composio";

export default function Header({ g, r, s, live, shareLink }: { g: Guide; r: Resolved; s: Situation; live: boolean; shareLink?: () => Promise<string> }) {
  return (
    <div className="build relative flex flex-col gap-6 pb-8 pt-10 sm:pt-14 lg:flex-row lg:items-end">
      <div aria-hidden className="glow pointer-events-none absolute -left-40 -top-40 h-[480px] w-[820px] max-w-[100vw] opacity-70" />
      <div className="relative max-w-2xl">
        <p className="label text-accent">Guide{g.generated && " · generated live"}</p>
        <h1 className="h-display mt-4 flex items-center gap-4">
          {g.name && <AppLogo src={logoSrc(g)} name={g.name} size={44} />}
          {g.name || "Investigating..."}
        </h1>
        {g.summary && <p className="mt-4 text-[16px] leading-relaxed text-ink-2 sm:text-[18px]">{g.summary}</p>}
        <p className="label mt-4 text-ink-3">
          {g.portal ? (
            <a href={g.portal} target="_blank" rel="noreferrer" className="hover:text-accent">
              {g.domain} developer portal ↗
            </a>
          ) : (
            g.domain
          )}
          {g.checked && <> · <span className="whitespace-nowrap">Checked {g.checked}</span></>}
        </p>
      </div>
      {!live && (
        <div className="relative hidden shrink-0 lg:ml-auto lg:block">
          <ShareBar g={g} r={r} s={s} shareLink={shareLink} />
        </div>
      )}
    </div>
  );
}
