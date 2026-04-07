"use client";

import { use } from "react";
import Link from "next/link";
import { useExperiment } from "@/hooks/use-experiments";
import { formatDate, experimentStatusColors } from "@/lib/utils";

export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: experiment, isLoading, error } = useExperiment(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
        <div className="h-40 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/experiments"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to experiments
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load experiment. Please try again.
        </div>
      </div>
    );
  }

  if (!experiment) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/experiments"
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        &larr; Back to experiments
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {experiment.name}
        </h1>
        <div className="flex items-center gap-4">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${experimentStatusColors[experiment.status]}`}
          >
            {experiment.status}
          </span>
          <span className="text-sm text-gray-500">
            Created {formatDate(experiment.created_at)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Manifest</h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          <code>{JSON.stringify(experiment.manifest, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
