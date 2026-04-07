export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Experiment Detail</h1>
      <p className="mt-2 text-muted-foreground">
        Experiment details and backtest results — coming soon.
      </p>
    </main>
  );
}
