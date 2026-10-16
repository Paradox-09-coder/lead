import type { Metadata } from "next";
import { CONTACT_EMAIL, Html, LegalPage } from "@/components/LegalPage";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: `${t("legal.dataDeletion.title")} — LeadSync` };
}

export default async function DataDeletionPage() {
  const { t } = await getT();
  const emailLink = `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`;
  const emailSubject = `<a href="mailto:${CONTACT_EMAIL}?subject=Data%20deletion%20request">${CONTACT_EMAIL}</a>`;
  const loginLink = `<a href="/login">LeadSync</a>`;

  return (
    <LegalPage title={t("legal.dataDeletion.title")}>
      <p>{t("legal.dataDeletion.intro")}</p>

      <h2>{t("legal.dataDeletion.h1")}</h2>
      <ul>
        <li><Html>{t("legal.dataDeletion.p1a", { loginLink })}</Html></li>
        <li>{t("legal.dataDeletion.p1b")}</li>
        <li><Html>{t("legal.dataDeletion.p1c")}</Html></li>
      </ul>

      <h2>{t("legal.dataDeletion.h2")}</h2>
      <p><Html>{t("legal.dataDeletion.p2intro", { email: emailSubject })}</Html></p>
      <ul>
        <li>{t("legal.dataDeletion.p2a")}</li>
        <li>{t("legal.dataDeletion.p2b")}</li>
        <li>{t("legal.dataDeletion.p2c")}</li>
        <li>{t("legal.dataDeletion.p2d")}</li>
      </ul>

      <h2>{t("legal.dataDeletion.h3")}</h2>
      <ul>
        <li>{t("legal.dataDeletion.p3a")}</li>
        <li>{t("legal.dataDeletion.p3b")}</li>
      </ul>

      <h2>{t("legal.dataDeletion.h4")}</h2>
      <p><Html>{t("legal.dataDeletion.p4", { email: emailLink })}</Html></p>
    </LegalPage>
  );
}
