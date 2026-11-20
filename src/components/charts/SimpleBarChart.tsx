"use client";

import { useMemo } from "react";
import { EChart } from "./EChart";
import { tooltipHtml, type ChartColors } from "./theme";

interface TooltipParam {
  value: number;
  color: string;
  dataIndex: number;
}

/** One series of rounded columns over a category axis (for example leads per day). */
export function SimpleBarChart({
  categories,
  tooltipTitles,
  values,
  seriesName,
  height = 200,
  ariaLabel,
}: {
  categories: string[];
  /** Full titles for the tooltip (defaults to the axis labels). */
  tooltipTitles?: string[];
  values: number[];
  seriesName: string;
  height?: number;
  ariaLabel?: string;
}) {
  const option = useMemo(
    () => (c: ChartColors) => ({
      grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: TooltipParam[]) => {
          const first = params[0];
          if (!first) return "";
          return tooltipHtml(tooltipTitles?.[first.dataIndex] ?? categories[first.dataIndex] ?? "", [
            { color: first.color, label: seriesName, value: String(first.value ?? 0) },
          ]);
        },
      },
      xAxis: { type: "category", data: categories, axisLabel: { hideOverlap: true } },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          name: seriesName,
          type: "bar",
          data: values,
          barMaxWidth: 22,
          itemStyle: { color: c.series[0], borderRadius: [6, 6, 2, 2] },
          emphasis: { focus: "series" },
        },
      ],
    }),
    [categories, tooltipTitles, values, seriesName],
  );

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
