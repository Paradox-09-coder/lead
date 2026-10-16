import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { WebForm } from "@/models/WebForm";
import { Logo } from "@/components/Logo";
import { PublicLeadForm } from "@/components/PublicLeadForm";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

async function findForm(slug: string) {
  await connectDB();
  return WebForm.findOne({ slug });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const form = await findForm(slug);
  return { title: form ? `${form.name} — LeadSync` : "LeadSync", robots: { index: false } };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const form = await findForm(slug);
  if (!form) notFound();

  const { t } = await getT();
  const param = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : undefined;
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <Logo size={32} />
        <span className="text-lg font-semibold">LeadSync</span>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold text-center">{form.name}</h1>
        <p className="mt-1 text-sm text-muted text-center">{t("webForms.publicSubtitle")}</p>
        <PublicLeadForm
          slug={form.slug}
          utm={{
            source: param("utm_source"),
            medium: param("utm_medium"),
            campaign: param("utm_campaign"),
            content: param("utm_content"),
            term: param("utm_term"),
          }}
        />
      </div>
    </main>
  );
}
