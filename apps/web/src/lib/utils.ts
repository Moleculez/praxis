import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Experiment } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const experimentStatusColors: Record<Experiment["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  promoted: "bg-purple-100 text-purple-800",
};
