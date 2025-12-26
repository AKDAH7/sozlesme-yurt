import type { PaymentMethod } from "@/types/db";

const LABELS: Record<PaymentMethod, string> = {
  cash: "Nakit",
  bank_transfer: "Havale/EFT",
  card: "Kart",
  other: "Diğer",
};

export function PaymentsByMethodTable(props: {
  rows: Array<{ method: PaymentMethod; total_received: string }>;
}) {
  const format = (value: string) =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-medium">Ödeme Yöntemine Göre</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">Yöntem</th>
              <th className="py-2">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => (
              <tr
                key={r.method}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2 pr-3">{LABELS[r.method]}</td>
                <td className="py-2 font-medium">
                  {format(r.total_received)} TRY
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
