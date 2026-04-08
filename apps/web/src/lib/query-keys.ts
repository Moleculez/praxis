export const queryKeys = {
  experiments: {
    all: ["experiments"] as const,
    detail: (id: string) => ["experiments", id] as const,
  },
  hypotheses: {
    all: ["hypotheses"] as const,
    detail: (id: string) => ["hypotheses", id] as const,
  },
  portfolios: {
    all: ["portfolios"] as const,
    detail: (id: string) => ["portfolios", id] as const,
  },
  audit: {
    decisions: ["audit", "decisions"] as const,
    incidents: ["audit", "incidents"] as const,
  },
  intelligence: {
    briefs: ["intelligence", "briefs"] as const,
    sources: ["intelligence", "sources"] as const,
    council: ["intelligence", "council"] as const,
  },
  research: {
    pipeline: (experimentId?: string) =>
      ["research", "pipeline", experimentId] as const,
  },
} as const;
