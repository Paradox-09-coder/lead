/**
 * ECharts look that matches Liquid Glass (ported from Data365 Studio charts/theme.ts): colours come from CSS
 * variables (so the light/dark switch applies), hairline dashed grid, no axis lines, rounded bars, glass tooltip
 * (the `.echarts-glass` class in app/globals.css).
 */
export interface ChartColors {
  series: string[];
  ink: string;
  ink2: string;
  ink3: string;
  grid: string;
  axis: string;
  primary: string;
  surface: string;
  dark: boolean;
}

export function readChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => read(`--chart-${i}`)),
    ink: read("--ink"),
    ink2: read("--ink-2"),
    ink3: read("--ink-3"),
    grid: read("--chart-grid"),
    axis: read("--chart-axis"),
    primary: read("--primary-brand"),
    surface: read("--surface-solid"),
    dark: document.documentElement.dataset.theme === "dark",
  };
}

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif`;

export function buildTheme(c: ChartColors): Record<string, unknown> {
  const axisCommon = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: c.ink3, fontSize: 11, fontFamily: FONT, hideOverlap: true },
    splitLine: { lineStyle: { color: c.grid, type: [3, 3] } },
    nameTextStyle: { color: c.ink3, fontSize: 11 },
  };
  return {
    color: c.series,
    backgroundColor: "transparent",
    textStyle: { fontFamily: FONT, color: c.ink2 },
    title: { textStyle: { color: c.ink, fontWeight: 600, fontSize: 14 } },
    legend: {
      textStyle: { color: c.ink2, fontSize: 12 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      inactiveColor: c.grid,
    },
    tooltip: {
      backgroundColor: "transparent",
      borderWidth: 0,
      padding: 0,
      className: "echarts-glass",
      textStyle: { color: c.ink, fontSize: 12, fontFamily: FONT },
      axisPointer: {
        lineStyle: { color: c.axis, type: [3, 3] },
        crossStyle: { color: c.axis },
        shadowStyle: { color: c.dark ? "rgba(255,255,255,0.04)" : "rgba(120,120,128,0.08)" },
      },
    },
    categoryAxis: { ...axisCommon, splitLine: { show: false } },
    valueAxis: { ...axisCommon, splitNumber: 4 },
    bar: { barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 2, 2] } },
    pie: { itemStyle: { borderColor: c.dark ? "#24242a" : "#ffffff", borderWidth: 2, borderRadius: 6 } },
  };
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);

/** Glass tooltip body: a title, rows of [colour, label, value] and an optional footer line. */
export function tooltipHtml(
  title: string,
  rows: { color?: string; label: string; value: string }[],
  footer?: string,
): string {
  const body = rows
    .map(
      (row) =>
        `<div class="et-row">${row.color ? `<span class="et-dot" style="background:${row.color}"></span>` : ""}<span class="et-label">${escapeHtml(row.label)}</span><span class="et-val">${escapeHtml(row.value)}</span></div>`,
    )
    .join("");
  return `<div class="et-title">${escapeHtml(title)}</div>${body}${footer ? `<div class="et-foot">${escapeHtml(footer)}</div>` : ""}`;
}
