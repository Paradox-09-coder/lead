import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return (
    <DashboardShell user={{ fullName: session?.fullName, email: session?.email }}>{children}</DashboardShell>
  );
}
