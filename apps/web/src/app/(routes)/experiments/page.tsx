"use client";

import { useState } from "react";
import Link from "next/link";
import { useExperiments, useCreateExperiment } from "@/hooks/use-experiments";
import { formatDate, experimentStatusColors } from "@/lib/utils";

export default function ExperimentsPage() {
  const { data: experiments, isLoading, error } = useExperiments();
  const createExperiment = useCreateExperiment();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createExperiment.mutate(trimmed, {
      onSuccess: () => {
        setName("");
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New Experiment
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Experiment name"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={createExperiment.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {createExperiment.isPending ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-md bg-gray-100"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load experiments. Please try again.
        </div>
      )}

      {experiments && experiments.length === 0 && (
        <p className="text-sm text-gray-500">
          No experiments yet. Create one to get started.
        </p>
      )}

      {experiments && experiments.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    <Link
                      href={`/experiments/${exp.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {exp.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${experimentStatusColors[exp.status]}`}
                    >
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(exp.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
