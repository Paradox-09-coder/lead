import type { Metadata } from "next";
import { CONTACT_EMAIL, Html, LegalPage } from "@/components/LegalPage";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t("legal.privacy.title")} — LeadSync` };
}

export default async function PrivacyPage() {
  const { t } = await getT();

  return (
    <LegalPage title={t("legal.privacy.title")}>
      <p>{t("legal.privacy.intro")}</p>

      <h2>{t("legal.privacy.h1")}</h2>
      <ul>
        <li><Html>{t("legal.privacy.p1account")}</Html></li>
        <li><Html>{t("legal.privacy.p1fb")}</Html></li>
        <li><Html>{t("legal.privacy.p1lead")}</Html></li>
        <li><Html>{t("legal.privacy.p1crm")}</Html></li>
        <li><Html>{t("legal.privacy.p1tech")}</Html></li>
      </ul>

      <h2>{t("legal.privacy.h2")}</h2>
      <ul>
        <li>{t("legal.privacy.p2a")}</li>
        <li>{t("legal.privacy.p2b")}</li>
        <li>{t("legal.privacy.p2c")}</li>
        <li>{t("legal.privacy.p2d")}</li>
      </ul>
      <p><Html>{t("legal.privacy.p2note")}</Html></p>

      <h2>{t("legal.privacy.h3")}</h2>
      <p>{t("legal.privacy.p3intro")}</p>
      <ul>
        <li><Html>{t("legal.privacy.p3a")}</Html></li>
        <li><Html>{t("legal.privacy.p3b")}</Html></li>
        <li><Html>{t("legal.privacy.p3c")}</Html></li>
        <li><Html>{t("legal.privacy.p3d")}</Html></li>
        <li><Html>{t("legal.privacy.p3e")}</Html></li>
        <li><Html>{t("legal.privacy.p3f")}</Html></li>
        <li><Html>{t("legal.privacy.p3g")}</Html></li>
      </ul>
      <p>{t("legal.privacy.p3note")}</p>

      <h2>{t("legal.privacy.h4")}</h2>
      <p>{t("legal.privacy.p4intro")}</p>
      <ul>
        <li>{t("legal.privacy.p4a")}</li>
        <li>{t("legal.privacy.p4b")}</li>
        <li>{t("legal.privacy.p4c")}</li>
      </ul>
      <p>{t("legal.privacy.p4note")}</p>

      <h2>{t("legal.privacy.h5")}</h2>
      <p>
        <Html>
          {t("legal.privacy.p5", {
            link: `<a href="/data-deletion">${t("legal.nav.dataDeletion")}</a>`,
          })}
        </Html>
      </p>

      <h2>{t("legal.privacy.h6")}</h2>
      <p>{t("legal.privacy.p6")}</p>

      <h2>{t("legal.privacy.h7")}</h2>
      <p>{t("legal.privacy.p7")}</p>

      <h2>{t("legal.privacy.h8")}</h2>
      <p>{t("legal.privacy.p8")}</p>

      <h2>{t("legal.privacy.h9")}</h2>
      <p>
        {t("legal.privacy.p9")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
