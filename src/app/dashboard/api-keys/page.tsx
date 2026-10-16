import { ApiKeysManager } from "@/components/dashboard/ApiKeysManager";
import { getT } from "@/i18n/server";

export default async function ApiKeysPage() {
  const { t } = await getT();
  const baseUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "https://leadsync-production-5873.up.railway.app";

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("apiKeys.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("apiKeys.subtitle")}</p>
      <ApiKeysManager baseUrl={baseUrl} />
    </div>
  );
}
