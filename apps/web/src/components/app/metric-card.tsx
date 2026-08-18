import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold tracking-tight">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
            <ArrowUpRight className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

