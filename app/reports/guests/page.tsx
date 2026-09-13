import { redirect } from "next/navigation";

/** Legacy path — master report now lives at /reports. */
export default function LegacyGuestReportRedirect() {
  redirect("/reports");
}
