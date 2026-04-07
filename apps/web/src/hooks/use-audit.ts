"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { AuditDecision } from "@/types";

export function useAuditDecisions() {
  return useQuery({
    queryKey: queryKeys.audit.decisions,
    queryFn: () => apiFetch<AuditDecision[]>("/audit/decisions"),
  });
}

export function useAuditIncidents() {
  return useQuery({
    queryKey: queryKeys.audit.incidents,
    queryFn: () => apiFetch<Record<string, string>[]>("/audit/incidents"),
  });
}
