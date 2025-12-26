import { cn } from "@/lib/utils";

function ReportCard(props: { title: string; value: string; subtle?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4")}>
      <div className="text-xs text-muted-foreground">{props.title}</div>
      <div className="mt-1 text-2xl font-semibold">{props.value}</div>
      {props.subtle ? (
        <div className="mt-1 text-xs text-muted-foreground">{props.subtle}</div>
      ) : null}
    </div>
  );
}

export function ReportsCards(props: {
  summary: {
    total_documents: number;
    total_sales: string;
    total_collected: string;
    remaining: string;
  };
}) {
  const format = (value: string) =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <ReportCard
        title="Toplam Belge"
        value={String(props.summary.total_documents)}
      />
      <ReportCard
        title="Toplam Satış"
        value={`${format(props.summary.total_sales)} TRY`}
      />
      <ReportCard
        title="Tahsilat"
        value={`${format(props.summary.total_collected)} TRY`}
      />
      <ReportCard
        title="Kalan"
        value={`${format(props.summary.remaining)} TRY`}
      />
    </div>
  );
}
