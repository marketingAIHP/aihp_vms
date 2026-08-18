"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const palette = ["var(--color-primary)", "var(--color-aqua)", "var(--color-beige-strong)", "var(--color-slategrey)"];

export function VisitorStatusChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Visitor Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={65} outerRadius={105} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function VisitorTrendChart({
  data,
}: {
  data: Array<{ month: string; visitors: number }>;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Monthly Visitor Trends</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <RechartsTooltip />
            <Bar dataKey="visitors" radius={[12, 12, 0, 0]} fill="var(--color-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

