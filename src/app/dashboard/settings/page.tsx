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
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("settings.subtitle")}</p>
      <SettingsForm fullName={user.fullName} email={user.email} />
    </div>
  );
}
