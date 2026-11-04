import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <p className="label text-accent">404</p>
      <h1 className="mt-4 text-[32px] tracking-tight">No guide at this address</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-2">Pick an app from the library, or type any app name and the agent builds its guide live.</p>
      <Link href="/" className="label mt-8 inline-flex h-11 items-center rounded-[4px] bg-accent px-5 text-on-accent">
        Go to the library
      </Link>
    </main>
  );
}
