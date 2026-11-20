import { ApiKeysManager } from "@/components/dashboard/ApiKeysManager";
import { getT } from "@/i18n/server";

export default async function ApiKeysPage() {
  const { t } = await getT();
  return (
    <div>
      <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.022em] text-ink sm:text-[2.125rem]">{t("apiKeys.title")}</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-2">{t("apiKeys.subtitle")}</p>
      <ApiKeysManager />
    </div>
  );
}
