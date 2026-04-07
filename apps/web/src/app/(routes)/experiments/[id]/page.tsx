export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Experiment Detail</h1>
      <p className="text-muted-foreground">
        Experiment details and backtest results — coming soon.
      </p>
    </div>
  );
}
