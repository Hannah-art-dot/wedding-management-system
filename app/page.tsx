import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { canManageGuests, getSession, homePathForRole } from "@/lib/auth";
import { getDashboardAnalytics } from "@/services/analytics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CHECKIN_STAFF") redirect(homePathForRole(session.role));
  if (!canManageGuests(session.role)) redirect("/check-in");

  const { summary, matrix } = await getDashboardAnalytics();

  return <AdminDashboard summary={summary} matrix={matrix} />;
}
