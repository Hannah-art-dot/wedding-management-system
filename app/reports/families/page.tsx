import { redirect } from "next/navigation";

/** Family attendance rollups remain on the Families pages; guest master report is /reports. */
export default function LegacyFamilyReportRedirect() {
  redirect("/reports");
}
