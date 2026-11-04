import data from "../data/toolkits.json";

// Composio's managed OAuth app directory (docs.composio.dev/toolkits/managed-auth), slimmed to the OAuth
// toolkits: who provides the OAuth app for each. From the MIT-licensed toolkits.json in Composio's docs.
type Toolkit = { slug: string; name: string; managed: boolean; category: string };
export const TOOLKITS: Toolkit[] = data;
export const MANAGED_COUNT = TOOLKITS.filter((t) => t.managed).length;

export const toolkit = (slug: string) => TOOLKITS.find((t) => t.slug === slug.toLowerCase().replace(/[^a-z0-9_]/g, ""));

export function findToolkits(q: string, n = 6): Toolkit[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const starts = TOOLKITS.filter((t) => t.name.toLowerCase().startsWith(needle) || t.slug.startsWith(needle));
  const has = TOOLKITS.filter((t) => !starts.includes(t) && (t.name.toLowerCase().includes(needle) || t.slug.includes(needle)));
  return [...starts, ...has].slice(0, n);
}
