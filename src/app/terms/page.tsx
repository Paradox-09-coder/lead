import type { Metadata } from "next";
import { CONTACT_EMAIL, Html, LegalPage } from "@/components/LegalPage";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t("legal.terms.title")} — LeadSync` };
}

export default async function TermsPage() {
  const { t } = await getT();

  return (
    <LegalPage title={t("legal.terms.title")}>
      <p>{t("legal.terms.intro")}</p>

      <h2>{t("legal.terms.h1")}</h2>
      <p>{t("legal.terms.p1")}</p>

      <h2>{t("legal.terms.h2")}</h2>
      <ul>
        <li>{t("legal.terms.p2a")}</li>
        <li>{t("legal.terms.p2b")}</li>
        <li>{t("legal.terms.p2c")}</li>
      </ul>

      <h2>{t("legal.terms.h3")}</h2>
      <p>{t("legal.terms.p3")}</p>

      <h2>{t("legal.terms.h4")}</h2>
      <p>{t("legal.terms.p4")}</p>

      <h2>{t("legal.terms.h5")}</h2>
      <ul>
        <li>{t("legal.terms.p5a")}</li>
        <li>{t("legal.terms.p5b")}</li>
        <li>{t("legal.terms.p5c")}</li>
        <li>{t("legal.terms.p5d")}</li>
      </ul>
      <p>{t("legal.terms.p5note")}</p>

      <h2>{t("legal.terms.h6")}</h2>
      <p>{t("legal.terms.p6")}</p>

      <h2>{t("legal.terms.h7")}</h2>
      <p>{t("legal.terms.p7")}</p>

      <h2>{t("legal.terms.h8")}</h2>
      <p>
        <Html>
          {t("legal.terms.p8", {
            link: `<a href="/data-deletion">${t("legal.nav.dataDeletion")}</a>`,
          })}
        </Html>
      </p>

      <h2>{t("legal.terms.h9")}</h2>
      <p>
        {t("legal.terms.p9")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
