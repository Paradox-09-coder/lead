import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon = Hammer,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-surface/50 py-20 flex flex-col items-center text-center px-6">
        <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
          <Icon className="size-5 text-primary" />
        </div>
        <p className="mt-4 font-medium">Tez orada</p>
        <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>
      </div>
    </div>
  );
}
