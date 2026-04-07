"use client";

const positionColumns = [
  "Ticker",
  "Side",
  "Qty",
  "Avg Price",
  "Current",
  "P&L",
];

const orderColumns = [
  "Time",
  "Ticker",
  "Side",
  "Qty",
  "Price",
  "Status",
];

export default function LivePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Live</h1>

      {/* Section 1: Trading Status */}
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
        <span className="font-medium">Paper Trading Mode</span>
      </div>

      {/* Section 2: Positions */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Positions</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {positionColumns.map((col) => (
                <th key={col} className="pb-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={positionColumns.length}
                className="py-8 text-center text-muted-foreground"
              >
                No open positions
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: Recent Orders */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Recent Orders</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {orderColumns.map((col) => (
                <th key={col} className="pb-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={orderColumns.length}
                className="py-8 text-center text-muted-foreground"
              >
                No orders yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 4: Daily Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Trades Today</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Gross P&L</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Net P&L</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-sm text-muted-foreground">
        Connect paper trading API keys in .env to start.
      </p>
    </div>
  );
}
