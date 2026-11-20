"use client";

import { useEffect, useRef } from "react";
import type { ECharts, EChartsCoreOption } from "echarts/core";
import { buildTheme, readChartColors, type ChartColors } from "./theme";

export type ChartOption = EChartsCoreOption | ((colors: ChartColors) => EChartsCoreOption);

// The library is fetched on first use and shared by every chart on the page.
let setupPromise: Promise<typeof import("./echarts-setup")> | null = null;
const loadECharts = () => (setupPromise ??= import("./echarts-setup"));

/**
 * ECharts in the Liquid Glass theme (ported from Data365 Studio). Re-themes when <html data-theme> flips, resizes with
 * its box and animates data changes.
 *
 *   <EChart height={260} ariaLabel="…" option={(c) => ({ xAxis: {...}, series: [...] })} />
 *
 * `option` can be a function of the current colours (c.series[i], c.ink3 …). Pass a memoised value: the chart
 * re-applies it whenever the reference changes.
 */
export function EChart({
  option,
  height = 260,
  className,
  ariaLabel,
}: {
  option: ChartOption;
  height?: number | string;
  className?: string;
  ariaLabel?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const optionRef = useRef(option);

  // Create the chart once, and re-create it when the theme changes (ECharts themes are fixed at init).
  useEffect(() => {
    const host = element.current;
    if (!host) return;
    let cancelled = false;
    let themeObserver: MutationObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;

    loadECharts().then(({ echarts }) => {
      if (cancelled) return;
      const create = () => {
        chart.current?.dispose();
        const colors = readChartColors();
        const name = `leadsync-${colors.dark ? "dark" : "light"}`;
        echarts.registerTheme(name, buildTheme(colors));
        chart.current = echarts.init(host, name, { renderer: "canvas" });
        const current = optionRef.current;
        chart.current.setOption(typeof current === "function" ? current(colors) : current);
      };
      create();
      themeObserver = new MutationObserver(create);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      resizeObserver = new ResizeObserver(() => chart.current?.resize({ animation: { duration: 0 } }));
      resizeObserver.observe(host);
    });

    return () => {
      cancelled = true;
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  // New data (for example another report period) is applied to the live chart.
  useEffect(() => {
    optionRef.current = option;
    const live = chart.current;
    if (!live) return;
    live.setOption(typeof option === "function" ? option(readChartColors()) : option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={element}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ height, width: "100%" }}
    />
  );
}
