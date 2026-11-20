import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";
import { getT } from "@/i18n/server";

export async function ComingSoon({
  title,
  description,
  icon: Icon = Hammer,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  const { t } = await getT();
  return (
    <div>
      <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.022em] text-ink sm:text-[2.125rem]">{title}</h1>
      <div className="mt-6 panel border-dashed py-20 flex flex-col items-center text-center px-6">
        <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
          <Icon className="size-5 text-primary" />
        </div>
        <p className="mt-4 font-medium">{t("comingSoon.label")}</p>
        <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>
      </div>
    </div>
  );
}
