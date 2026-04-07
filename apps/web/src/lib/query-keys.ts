export const queryKeys = {
  experiments: {
    all: ["experiments"] as const,
    detail: (id: string) => ["experiments", id] as const,
  },
  hypotheses: {
    all: ["hypotheses"] as const,
  },
  portfolios: {
    all: ["portfolios"] as const,
  },
  audit: {
    decisions: ["audit", "decisions"] as const,
  },
  intelligence: {
    briefs: ["intelligence", "briefs"] as const,
  },
} as const;
