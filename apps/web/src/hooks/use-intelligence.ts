"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { IntelBrief, CrawlerSource } from "@/types";

export function useIntelBriefs() {
  return useQuery({
    queryKey: queryKeys.intelligence.briefs,
    queryFn: () => apiFetch<IntelBrief[]>("/intelligence/briefs"),
  });
}

export function useCrawlerSources() {
  return useQuery({
    queryKey: queryKeys.intelligence.sources,
    queryFn: () => apiFetch<CrawlerSource[]>("/intelligence/sources"),
  });
}
