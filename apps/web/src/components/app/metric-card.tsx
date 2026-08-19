import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper,
  href,
}: {
  label: string;
  value: string | number;
  helper: string;
  href?: string;
}) {
  const card = (
    <Card className={`h-full border-border/70 bg-card/90 transition-all duration-200 ${href ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold tracking-tight">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <ArrowUpRight className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link aria-label={`View ${label}`} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={href}>{card}</Link> : card;
}
