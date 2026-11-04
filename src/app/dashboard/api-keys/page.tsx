import { ApiKeysManager } from "@/components/dashboard/ApiKeysManager";
import { getT } from "@/i18n/server";

export default async function ApiKeysPage() {
  const { t } = await getT();
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("apiKeys.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("apiKeys.subtitle")}</p>
      <ApiKeysManager />
    </div>
  );
}
