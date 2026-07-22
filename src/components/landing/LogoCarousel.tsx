import { CAROUSEL_LOGOS } from "@/lib/mock-data";

export function LogoCarousel() {
  const track = [...CAROUSEL_LOGOS, ...CAROUSEL_LOGOS];

  return (
    <section className="border-y border-border bg-surface/50 py-10 overflow-hidden">
      <p className="text-center text-xs tracking-widest text-muted uppercase mb-6">Integratsiyalar</p>
      <div className="flex w-max animate-marquee">
        {track.map((logo, index) => (
          <div key={`${logo.name}-${index}`} className="flex items-center gap-2 px-8 shrink-0">
            <span
              className="flex size-8 items-center justify-center rounded-md text-xs font-bold text-white"
              style={{ backgroundColor: logo.color }}
            >
              {logo.initials}
            </span>
            <span className="text-sm text-muted whitespace-nowrap">{logo.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
