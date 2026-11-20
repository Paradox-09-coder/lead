"use client";

import { useMemo } from "react";
import { EChart } from "./EChart";
import { tooltipHtml, type ChartColors } from "./theme";

export interface DonutItem {
  key: string;
  name: string;
  value: number;
}

// Fixed colour per lead source so a source keeps its colour whatever the other sources are.
const SOURCE_SERIES_INDEX: Record<string, number> = { facebook: 0, form: 2, api: 4 };

interface ItemParam {
  name: string;
  value: number;
  color: string;
  percent: number;
}

/** Share of leads by source: a donut with the total in the middle and a vertical legend. */
export function SourceDonut({
  items,
  totalLabel,
  height = 220,
  ariaLabel,
  legend = true,
}: {
  items: DonutItem[];
  totalLabel: string;
  height?: number;
  ariaLabel?: string;
  /** false = centred donut without the legend (when the page lists the sources itself). */
  legend?: boolean;
}) {
  const option = useMemo(
    () => (c: ChartColors) => {
      const total = items.reduce((sum, item) => sum + item.value, 0);
      return {
        tooltip: {
          trigger: "item",
          formatter: (p: ItemParam) =>
            tooltipHtml(p.name, [{ color: p.color, label: totalLabel, value: p.value.toLocaleString("en-US") }], `${p.percent.toFixed(1)}%`),
        },
        legend: {
          show: legend,
          orient: "vertical",
          right: 0,
          top: "middle",
          formatter: (name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name),
        },
        series: [
          {
            type: "pie",
            radius: ["56%", "82%"],
            center: [legend ? "34%" : "50%", "50%"],
            avoidLabelOverlap: true,
            label: {
              show: true,
              position: "center",
              formatter: () => `{v|${total.toLocaleString("en-US")}}\n{l|${totalLabel}}`,
              rich: {
                v: { fontSize: 22, fontWeight: 700, color: c.ink, lineHeight: 28 },
                l: { fontSize: 11, color: c.ink3 },
              },
            },
            labelLine: { show: false },
            emphasis: { scale: true, scaleSize: 6, label: { show: true } },
            data: items.map((item) => ({
              name: item.name,
              value: item.value,
              itemStyle: { color: c.series[SOURCE_SERIES_INDEX[item.key] ?? 5] },
            })),
          },
        ],
      };
    },
    [items, totalLabel, legend],
  );

  return <EChart option={option} height={height} ariaLabel={ariaLabel} />;
}
