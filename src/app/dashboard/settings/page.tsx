import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  const { t } = await getT();
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  await connectDB();
  const user = await User.findById(userId);
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.022em] text-ink sm:text-[2.125rem]">{t("settings.title")}</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-2">{t("settings.subtitle")}</p>
      <SettingsForm fullName={user.fullName} email={user.email} />
    </div>
  );
}
