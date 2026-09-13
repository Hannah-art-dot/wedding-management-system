import { redirect } from "next/navigation";

/** Alias for the main admin dashboard (SRS §13). */
export default function DashboardAliasPage() {
  redirect("/");
}
