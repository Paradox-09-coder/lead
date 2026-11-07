"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Database,
  Megaphone,
  PhoneCall,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useT } from "@/i18n/client";
import styles from "./LeadStory.module.css";

type Point = readonly [number, number];
type Translate = (key: string) => string;

// The route of one lead across a flat map, in map coordinates. Each stop is a
// tile; `rot` is the camera's turn while it looks at that tile.
const STOPS = [
  { x: 840, y: 600, rot: -48, color: "#3b82f6" },
  { x: 1320, y: 960, rot: -28, color: "#6366f1" },
  { x: 1920, y: 1200, rot: -62, color: "#8b5cf6" },
  { x: 2040, y: 1920, rot: -24, color: "#10b981" },
  { x: 1320, y: 2160, rot: -58, color: "#14b8a6" },
  { x: 840, y: 1560, rot: -36, color: "#22d3ee" },
] as const;

// Corners of the road between one stop and the next.
const ROADS: Point[][] = [
  [[840, 600], [1320, 600], [1320, 960]],
  [[1320, 960], [1560, 960], [1560, 1200], [1920, 1200]],
  [[1920, 1200], [1920, 1560], [2280, 1560], [2280, 1920], [2040, 1920]],
  [[2040, 1920], [1680, 1920], [1680, 2160], [1320, 2160]],
  [[1320, 2160], [960, 2160], [960, 1920], [720, 1920], [720, 1560], [840, 1560]],
];

const MAP_SIZE = 3000;
const MAP_CENTER = { x: 1500, y: 1380 };

function roundedPath(points: Point[], radius = 60): string {
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inX = Math.sign(cx - px);
    const inY = Math.sign(cy - py);
    const outX = Math.sign(nx - cx);
    const outY = Math.sign(ny - cy);
    d += ` L ${cx - inX * radius} ${cy - inY * radius} Q ${cx} ${cy} ${cx + outX * radius} ${cy + outY * radius}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d} L ${lx} ${ly}`;
}

const ROAD_PATHS = ROADS.map((road) => roundedPath(road));
// One unbroken route, for the pulses that keep running in the final overview.
const FULL_ROUTE = ROAD_PATHS.map((d, i) => (i === 0 ? d : d.replace(/^M/, "L"))).join(" ");

// Scroll timeline, 0..1 across the whole pinned section.
const FIRST_STOP = 0.08;
const STOP_GAP = 0.135;
const HOLD = 0.06;
const OVERVIEW_OUT_START = 0.02;
const OVERVIEW_OUT_END = 0.08;
const stopAt = (index: number) => FIRST_STOP + index * STOP_GAP;
const FINAL_START = stopAt(STOPS.length - 1) + HOLD;
const FINAL_END = 0.9;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// 0 = at the first stop, 1 = at the second, 1.5 = halfway down the second road…
function routePosition(u: number): number {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const leave = stopAt(i) + HOLD;
    const arrive = stopAt(i + 1);
    if (u <= leave) return i;
    if (u < arrive) return i + smooth(leave, arrive, u);
  }
  return STOPS.length - 1;
}

// How far zoomed out the camera is: 1 on the opening and final views.
const overviewWeight = (u: number) =>
  1 - smooth(OVERVIEW_OUT_START, OVERVIEW_OUT_END, u) + smooth(FINAL_START, FINAL_END, u);

// Fades in over in0..in1 and out over out0..out1.
const window01 = (u: number, in0: number, in1: number, out0: number, out1: number) =>
  smooth(in0, in1, u) * (1 - smooth(out0, out1, u));

function setLayer(el: HTMLElement, opacity: number, shift = 0) {
  el.style.opacity = opacity.toFixed(3);
  el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
  el.style.transform = shift ? `translate3d(0, ${shift.toFixed(1)}px, 0)` : "";
}

function stageLogic(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-stage]")!;
  const world = root.querySelector<HTMLElement>("[data-world]")!;
  const head = root.querySelector<HTMLElement>("[data-head]")!;
  const scrimCenter = root.querySelector<HTMLElement>("[data-scrim-center]")!;
  const scrimSide = root.querySelector<HTMLElement>("[data-scrim-side]")!;
  const hero = root.querySelector<HTMLElement>("[data-hero]")!;
  const final = root.querySelector<HTMLElement>("[data-final]")!;
  const steps = [...root.querySelectorAll<HTMLElement>("[data-step]")];
  const tiles = [...root.querySelectorAll<HTMLElement>("[data-tile]")];
  const roads = ROADS.map((_, i) => [...root.querySelectorAll<SVGPathElement>(`[data-road="${i}"]`)]);
  const lengths = roads.map(([path]) => path.getTotalLength());
  const fills = roads.map(() => -1);

  let vw = 0;
  let vh = 0;
  let base = 1;
  let wide = true;

  const measure = () => {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    wide = vw >= 1024;
    base = clamp(Math.min(vw / 1440, vh / 800), 0.5, 1.1);
  };

  const render = (u: number) => {
    const pos = routePosition(u);
    const index = Math.min(Math.floor(pos), STOPS.length - 2);
    const frac = pos - index;

    // Lit road: only the piece being drawn changes, so only it repaints.
    roads.forEach((paths, i) => {
      const fill = u < stopAt(0) - 0.02 ? 0 : clamp(pos - i);
      if (fill === fills[i]) return;
      fills[i] = fill;
      for (const path of paths) {
        path.style.strokeDashoffset = String(1 - fill);
        path.style.visibility = fill > 0 ? "visible" : "hidden";
      }
    });

    const point = roads[index][0].getPointAtLength(lengths[index] * frac);
    head.style.transform = `translate3d(${point.x}px, ${point.y}px, 6px)`;
    head.style.opacity = smooth(stopAt(0) - 0.03, stopAt(0) - 0.01, u).toFixed(3);
    const color = STOPS[Math.round(pos)].color;
    if (head.dataset.color !== color) {
      head.dataset.color = color;
      head.style.setProperty("--glow", color);
    }

    // Camera: follows the lead, and pulls back for the opening and final views.
    const weight = overviewWeight(u);
    const focusX = lerp(point.x, MAP_CENTER.x, weight);
    const focusY = lerp(point.y, MAP_CENTER.y, weight);
    const overviewScale = Math.min(0.5 * base, vw / 2000);
    const scale = lerp(base, overviewScale, weight);
    const stepRot = lerp(STOPS[index].rot, STOPS[index + 1].rot, frac);
    const overviewRot = lerp(-45, -28, smooth(FINAL_START, 1, u));
    const rotZ = lerp(stepRot, overviewRot, weight);
    const rotX = lerp(50, 57, weight);
    const anchorX = lerp(wide ? vw * 0.64 : vw * 0.5, vw * 0.5, weight);
    const anchorY = lerp(wide ? vh * 0.52 : vh * 0.34, vh * 0.5, weight);
    world.style.transform =
      `translate3d(${anchorX.toFixed(1)}px, ${anchorY.toFixed(1)}px, 0) ` +
      `rotateX(${rotX.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${scale.toFixed(4)}) ` +
      `translate3d(${(-focusX).toFixed(1)}px, ${(-focusY).toFixed(1)}px, 0)`;

    const isFinal = u >= FINAL_START + 0.03;
    if ((world.dataset.running === "true") !== isFinal) world.dataset.running = String(isFinal);

    tiles.forEach((tile, i) => {
      const reached = u >= stopAt(0) - 0.02 && pos >= i - 0.02;
      const state = !reached ? "off" : !isFinal && Math.abs(pos - i) < 0.3 ? "current" : "on";
      if (tile.dataset.state !== state) tile.dataset.state = state;
    });

    scrimCenter.style.opacity = (weight * (u < 0.5 ? 1 : 0.9)).toFixed(3);
    scrimSide.style.opacity = (1 - weight).toFixed(3);

    const heroOpacity = 1 - smooth(0.015, 0.055, u);
    setLayer(hero, heroOpacity, -24 * (1 - heroOpacity));
    setLayer(final, smooth(FINAL_START + 0.03, FINAL_END + 0.01, u), 24 * (1 - smooth(FINAL_START + 0.03, FINAL_END + 0.01, u)));
    steps.forEach((step, i) => {
      const at = stopAt(i);
      const opacity = window01(u, at - 0.02, at + 0.005, at + HOLD + 0.03, at + HOLD + 0.055);
      setLayer(step, opacity, 18 * (1 - opacity) * (u < at ? 1 : -1));
    });
  };

  return { measure, render };
}

interface DemoRow {
  label: string;
  value: string;
  tone?: "good" | "accent";
}

interface StoryStep {
  icon: LucideIcon | "logo";
  key: string;
  rows: (t: Translate) => DemoRow[];
}

const LEAD_NAME = "Aziz Karimov";
const LEAD_PHONE = "+998 90 123 45 67";

const STEPS: StoryStep[] = [
  {
    icon: Megaphone,
    key: "s1",
    rows: (t) => [
      { label: t("leadStory.rowAd"), value: t("leadStory.rowAdValue") },
      { label: t("leadStory.rowPlace"), value: "Facebook · Instagram" },
    ],
  },
  {
    icon: ClipboardList,
    key: "s2",
    rows: (t) => [
      { label: t("leadStory.rowName"), value: LEAD_NAME },
      { label: t("leadStory.rowPhone"), value: LEAD_PHONE },
      { label: t("leadStory.rowQuestion"), value: t("leadStory.rowQuestionValue") },
    ],
  },
  {
    icon: "logo",
    key: "s3",
    rows: (t) => [
      { label: t("leadStory.rowName"), value: `→ ${t("leadStory.rowName")}`, tone: "accent" },
      { label: t("leadStory.rowPhone"), value: `→ ${t("leadStory.rowPhone")}`, tone: "accent" },
      { label: t("leadStory.rowQuestion"), value: `→ ${t("leadStory.rowNewField")}`, tone: "accent" },
    ],
  },
  {
    icon: Database,
    key: "s4",
    rows: (t) => [
      { label: "CRM", value: "Bitrix24 · amoCRM" },
      { label: t("leadStory.rowStage"), value: t("leadStory.rowStageValue") },
      { label: t("leadStory.rowStatus"), value: t("leadStory.rowDelivered"), tone: "good" },
    ],
  },
  {
    icon: PhoneCall,
    key: "s5",
    rows: (t) => [
      { label: t("leadStory.rowNewLead"), value: LEAD_NAME },
      { label: t("leadStory.rowPhone"), value: LEAD_PHONE, tone: "good" },
    ],
  },
  {
    icon: BarChart3,
    key: "s6",
    rows: (t) => [
      { label: t("leadStory.rowToday"), value: t("leadStory.rowTodayValue") },
      { label: t("leadStory.rowForm"), value: t("leadStory.rowAdValue") },
      { label: t("leadStory.rowDelivered"), value: "100%", tone: "good" },
    ],
  },
];

function StepIcon({ step, className }: { step: StoryStep; className?: string }) {
  if (step.icon === "logo") return <Logo size={124} />;
  const Icon = step.icon;
  return <Icon className={className} strokeWidth={1.5} />;
}

function PrimaryCta({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/register"
      className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-white shadow-[0_0_32px_rgba(99,102,241,0.45)] transition-colors hover:bg-primary-hover"
    >
      <Rocket className="size-4" />
      {children}
    </Link>
  );
}

// Faint, never-lit tiles that make the map feel bigger than the route.
const DECOYS: Point[] = [
  [1680, 480],
  [2400, 960],
  [480, 1080],
  [1200, 1560],
  [2520, 2280],
  [480, 2280],
];

// Fixed scatter for the final view (no randomness: server and client must agree).
const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  x: 480 + ((i * 739) % 2100),
  y: 420 + ((i * 1171) % 1980),
  size: 14 + (i % 4) * 7,
  delay: (i % 6) * -0.9,
  color: STOPS[i % STOPS.length].color,
}));

function StoryMap({ t }: { t: Translate }) {
  return (
    <div
      data-world
      data-running="false"
      className={styles.world}
      style={{
        width: MAP_SIZE,
        height: MAP_SIZE,
        transform: `translate3d(50vw, 50vh, 0) rotateX(57deg) rotateZ(-45deg) scale(0.5) translate3d(${-MAP_CENTER.x}px, ${-MAP_CENTER.y}px, 0)`,
      }}
    >
      <div className={styles.grid} />

      {DECOYS.map(([x, y]) => (
        <div key={`${x}-${y}`} className={styles.decoy} style={{ left: x, top: y }} />
      ))}

      <svg className={styles.roads} width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} fill="none">
        <defs>
          {ROADS.map((road, i) => {
            const [x1, y1] = road[0];
            const [x2, y2] = road[road.length - 1];
            return (
              <linearGradient key={i} id={`road-${i}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                <stop offset="0" stopColor={STOPS[i].color} />
                <stop offset="1" stopColor={STOPS[i + 1].color} />
              </linearGradient>
            );
          })}
        </defs>
        {ROAD_PATHS.map((d) => (
          <path key={d} d={d} stroke="rgba(255,255,255,0.09)" strokeWidth={3} />
        ))}
        {ROAD_PATHS.map((d, i) => (
          <g key={d} stroke={`url(#road-${i})`} strokeLinecap="round">
            <path data-road={i} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} strokeWidth={30} strokeOpacity={0.14} visibility="hidden" />
            <path data-road={i} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} strokeWidth={13} strokeOpacity={0.35} visibility="hidden" />
            <path data-road={i} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} strokeWidth={6} visibility="hidden" />
          </g>
        ))}
      </svg>

      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={styles.pulse}
          style={{ offsetPath: `path("${FULL_ROUTE}")`, animationDelay: `${i * -1.6}s` }}
        />
      ))}

      {SPARKS.map((spark, i) => (
        <span
          key={i}
          className={styles.spark}
          style={{
            left: spark.x,
            top: spark.y,
            width: spark.size,
            height: spark.size,
            background: spark.color,
            animationDelay: `${spark.delay}s`,
          }}
        />
      ))}

      {STEPS.map((step, i) => {
        const stop = STOPS[i];
        return (
          <div
            key={step.key}
            data-tile
            data-state="off"
            data-brand={step.icon === "logo" ? "true" : undefined}
            className={styles.tile}
            style={{ left: stop.x, top: stop.y, ["--tile-color" as string]: stop.color }}
          >
            <span className={styles.tileShadow} />
            {step.icon === "logo" && <span className={styles.tileRing} />}
            {[6, 12, 18].map((z) => (
              <span key={z} className={styles.tileLayer} style={{ transform: `translateZ(${z}px)` }} />
            ))}
            <span className={styles.tileTop}>
              <span className={styles.tileIcon}>
                <StepIcon step={step} className="size-24" />
              </span>
            </span>
            <span className={styles.tileLabel}>{t(`leadStory.${step.key}Tile`)}</span>
          </div>
        );
      })}

      <div data-head className={styles.head} style={{ opacity: 0 }}>
        <span className={styles.headGlow} />
        <span className={styles.headCore} />
      </div>
    </div>
  );
}

function DemoCard({ rows }: { rows: DemoRow[] }) {
  return (
    <dl className="mt-5 w-full max-w-sm divide-y divide-border rounded-xl border border-border bg-surface/80 text-sm backdrop-blur">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="min-w-0 text-muted">{row.label}</dt>
          <dd
            className={`text-right font-medium ${
              row.tone === "good" ? "text-success" : row.tone === "accent" ? "text-[#a5b4fc]" : ""
            }`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function HeroTitle({ t }: { t: Translate }) {
  return (
    <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
      {t("leadStory.titlePart1")}{" "}
      <span className="bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#34d399] bg-clip-text text-transparent">
        {t("leadStory.titleAccent")}
      </span>{" "}
      {t("leadStory.titlePart2")}
    </h1>
  );
}

function FinalStats({ t }: { t: Translate }) {
  return (
    <div className="mx-auto mt-8 grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-4">
      {["stat1", "stat2", "stat3"].map((key) => (
        <div key={key} className="rounded-xl border border-border bg-surface/80 p-3 text-left backdrop-blur sm:p-5">
          <p className="text-xl font-bold sm:text-3xl">{t(`leadStory.${key}Value`)}</p>
          <p className="mt-1 text-xs text-muted sm:text-sm">{t(`leadStory.${key}Label`)}</p>
        </div>
      ))}
    </div>
  );
}

// The landing page's opening: scrolling walks one lead along its whole route,
// with the camera following and turning, then pulls back to show it all lit.
export function LeadStory() {
  const { t } = useT();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const { measure, render } = stageLogic(root);
    const target = () => {
      const rect = root.getBoundingClientRect();
      return clamp(-rect.top / (rect.height - window.innerHeight));
    };

    let current = target();
    let frame = 0;
    const tick = () => {
      const goal = target();
      current += (goal - current) * 0.14;
      if (Math.abs(goal - current) < 0.00005) current = goal;
      render(current);
      frame = current === goal ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      render(current);
    };

    onResize();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="relative">
      {/* "How it works" link lands on the first step, not back on the opening. */}
      <span id="qanday-ishlaydi" className="absolute top-[48vh] motion-reduce:top-0" />

      <section ref={rootRef} className="relative h-[700vh] motion-reduce:hidden">
        <div data-stage className={`${styles.stage} sticky top-0 h-[100svh] overflow-hidden`}>
          <div aria-hidden className={styles.perspective}>
            <StoryMap t={t} />
          </div>

          <div data-scrim-center aria-hidden className={styles.scrimCenter} />
          <div data-scrim-side aria-hidden className={styles.scrimSide} style={{ opacity: 0 }} />

          <div data-hero className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-1.5 text-xs text-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-success" />
              {t("leadStory.badge")}
            </p>
            <div className="max-w-4xl">
              <HeroTitle t={t} />
            </div>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">{t("leadStory.subtitle")}</p>
            <div className="mt-8">
              <PrimaryCta>{t("leadStory.cta")}</PrimaryCta>
            </div>
            <div className="absolute bottom-8 flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-muted">
              {t("leadStory.scrollHint")}
              <ChevronDown className={`${styles.hint} size-4`} />
            </div>
          </div>

          {STEPS.map((step, i) => (
            <div
              key={step.key}
              data-step
              className="invisible absolute inset-x-0 bottom-0 px-6 pb-10 opacity-0 lg:inset-y-0 lg:right-auto lg:flex lg:w-[46%] lg:flex-col lg:justify-center lg:pb-0 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
            >
              <p className="text-xs font-semibold tracking-[0.3em]" style={{ color: STOPS[i].color }}>
                0{i + 1}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{t(`leadStory.${step.key}Title`)}</h2>
              <p className="mt-3 max-w-md text-sm text-muted sm:text-base">{t(`leadStory.${step.key}Body`)}</p>
              <div className="hidden sm:block">
                <DemoCard rows={step.rows(t)} />
              </div>
            </div>
          ))}

          <div
            data-final
            className="invisible absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0"
          >
            <h2 className="max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {t("leadStory.finalTitle")}
            </h2>
            <p className="mt-4 max-w-xl text-muted">{t("leadStory.finalBody")}</p>
            <FinalStats t={t} />
            <div className="mt-8">
              <PrimaryCta>{t("leadStory.cta")}</PrimaryCta>
            </div>
          </div>
        </div>
      </section>

      {/* Same story without the movement, for people who turned animation off. */}
      <section className="mx-auto hidden max-w-3xl px-6 pb-16 pt-28 motion-reduce:block">
        <div className="text-center">
          <HeroTitle t={t} />
          <p className="mt-5 text-muted">{t("leadStory.subtitle")}</p>
          <div className="mt-8">
            <PrimaryCta>{t("leadStory.cta")}</PrimaryCta>
          </div>
        </div>
        <ol className="mt-14 space-y-10">
          {STEPS.map((step, i) => (
            <li key={step.key}>
              <p className="text-xs font-semibold tracking-[0.3em]" style={{ color: STOPS[i].color }}>
                0{i + 1}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{t(`leadStory.${step.key}Title`)}</h2>
              <p className="mt-2 text-muted">{t(`leadStory.${step.key}Body`)}</p>
              <DemoCard rows={step.rows(t)} />
            </li>
          ))}
        </ol>
        <FinalStats t={t} />
      </section>
    </div>
  );
}
