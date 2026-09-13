import { redirect } from "next/navigation";

/** Consolidated into the master Complete Guest List (filter: Dinner / Coming). */
export default function LegacyDinnerReportRedirect() {
  redirect("/reports");
}
