"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { IntelBrief } from "@/types";

export function useIntelBriefs() {
  return useQuery({
    queryKey: queryKeys.intelligence.briefs,
    queryFn: () => apiFetch<IntelBrief[]>("/intelligence/briefs"),
    enabled: false, // API not ready yet — disable auto-fetch
  });
}
