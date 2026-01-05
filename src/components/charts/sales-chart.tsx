"use client";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function SalesChart({
  data,
  valueLabel = "Ventas",
}: {
  data: { month: string; value: number }[];
  valueLabel?: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="value" strokeWidth={3} dot={false} name={valueLabel} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
