import { z } from "zod";

// One schema for library guides and live agent guides.

export const DIFFICULTIES = ["instant", "easy", "moderate", "hard", "gated"] as const;
export const BADGES = ["tested", "official", "third_party", "unverified"] as const;
export const PROFILES = ["individual", "startup", "company"] as const;
export const AUDIENCES = ["few", "many"] as const;

export const Difficulty = z.enum(DIFFICULTIES);
export const Badge = z.enum(BADGES);

// An item applies only when every listed dimension matches the reader's situation.
// Omitted dimension = applies to everyone.
export const When = z
  .object({
    profile: z.array(z.enum(PROFILES)).optional().describe("Applies only to these developer profiles"),
    audience: z
      .array(z.enum(AUDIENCES))
      .optional()
      .describe("few = just you and a handful of testers; many = real users / public launch"),
    needs: z
      .array(z.string())
      .optional()
      .describe("Applies if the reader picked ANY of these need ids"),
  })
  .strict();

const sourced = {
  when: When.optional(),
  sourceIds: z.array(z.string()).default([]).describe("ids of cited sources backing this claim"),
};

export const Verdict = z.object({
  difficulty: Difficulty,
  handsOn: z.string().describe("Developer's own working time, e.g. '15 min'"),
  waiting: z.string().describe("Time waiting on the provider, e.g. 'None' or '2 to 6 weeks'"),
  why: z.string().describe("One plain sentence on why"),
  ...sourced,
});

export const SkipPath = z.object({
  composioManaged: z.enum(["yes", "no", "unknown"]),
  mcpDcr: z.enum(["yes", "no", "unknown"]).describe("Provider MCP server supports dynamic client registration"),
  mcpServer: z.string().optional(),
  note: z.string(),
  whyOwnApp: z.array(z.string()).default([]).describe("Reasons to register your own app anyway"),
  sourceIds: z.array(z.string()).default([]),
});

export const Requirement = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  agentCanDraft: z.boolean().default(false),
  ...sourced,
});

export const Step = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  actor: z.enum(["agent", "you", "provider"]),
  duration: z.string(),
  ...sourced,
});

export const Scope = z.object({
  name: z.string(),
  meaning: z.string(),
  tier: z.enum(["basic", "sensitive", "restricted"]),
  triggersReview: z.boolean(),
  ...sourced,
});

export const Limit = z.object({ id: z.string(), title: z.string(), detail: z.string(), ...sourced });
export const Blocker = z.object({ id: z.string(), symptom: z.string(), fix: z.string(), ...sourced });

export const Source = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  badge: Badge,
  checked: z.string().describe("YYYY-MM-DD"),
  note: z.string().optional(),
});

export const Need = z.object({ id: z.string(), label: z.string() });

export const Guide = z.object({
  slug: z.string(),
  name: z.string(),
  domain: z.string(),
  portal: z.string().optional(),
  summary: z.string(),
  needs: z.array(Need).default([]),
  defaultNeeds: z.array(z.string()).default([]),
  verdicts: z.array(Verdict).min(1),
  skip: SkipPath,
  requirements: z.array(Requirement).default([]),
  steps: z.array(Step).default([]),
  scopes: z.array(Scope).default([]),
  limits: z.array(Limit).default([]),
  blockers: z.array(Blocker).default([]),
  sources: z.array(Source).default([]),
  unverified: z.array(z.string()).default([]),
  checked: z.string(),
  generated: z.boolean().default(false),
});

export type Guide = z.infer<typeof Guide>;
export type Verdict = z.infer<typeof Verdict>;
export type WhenT = z.infer<typeof When>;
export type Source = z.infer<typeof Source>;
export type Difficulty = z.infer<typeof Difficulty>;
export type BadgeT = z.infer<typeof Badge>;
