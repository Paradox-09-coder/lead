"use client";

import { useMemo } from "react";
import { EChart } from "./EChart";
import { tooltipHtml, type ChartColors } from "./theme";

export interface TrendDay {
  date: string; // YYYY-MM-DD
  total: number;
  success: number;
  failed: number;
}

export interface TrendLabels {
  delivered: string;
  failed: string;
  waiting: string;
  total: string;
}

interface TooltipParam {
  seriesName: string;
  value: number;
  color: string;
  dataIndex: number;
}

const shortDate = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`;

/** Leads per day, stacked by delivery status: delivered, waiting, failed. */
export function LeadsTrendChart({
  days,
  labels,
  height = 260,
  ariaLabel,
}: {
  days: TrendDay[];
  labels: TrendLabels;
  height?: number;
  ariaLabel?: string;
}) {
  const option = useMemo(
    () => (c: ChartColors) => {
      const dates = days.map((day) => shortDate(day.date));
      const waiting = days.map((day) => Math.max(0, day.total - day.success - day.failed));
      const bar = (name: string, data: number[], color: string) => ({
        name,
        type: "bar" as const,
        stack: "total",
        data,
        barMaxWidth: 22,
        itemStyle: { color, borderRadius: 3 },
        emphasis: { focus: "series" as const },
      });
      return {
        grid: { left: 4, right: 12, top: 36, bottom: 4, containLabel: true },
        legend: { show: true, top: 0, left: 0 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params: TooltipParam[]) => {
            const first = params[0];
            if (!first) return "";
            const total = params.reduce((sum, p) => sum + (p.value ?? 0), 0);
            return tooltipHtml(
              days[first.dataIndex]?.date ?? "",
              params.map((p) => ({ color: p.color, label: p.seriesName, value: String(p.value ?? 0) })),
              `${labels.total}: ${total}`,
            );
          },
        },
        xAxis: { type: "category", data: dates, axisLabel: { hideOverlap: true } },
        yAxis: { type: "value", minInterval: 1 },
        series: [
          bar(labels.delivered, days.map((day) => day.success), c.series[1]),
          bar(labels.waiting, waiting, c.series[0]),
          bar(labels.failed, days.map((day) => day.failed), c.series[3]),
        ],
      };
    },
    [days, labels.delivered, labels.failed, labels.total, labels.waiting],
  );

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
