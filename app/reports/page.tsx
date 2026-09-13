import { MasterGuestReport } from "@/components/reports/MasterGuestReport";
import { getGuestReportRows } from "@/services/analytics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Complete Guest List",
  description: "Master printable guest report with filters and CSV export",
};

export default async function ReportsPage() {
  const rows = await getGuestReportRows();
  return (
    <main className="flex-1">
      <MasterGuestReport rows={rows} />
    </main>
  );
}
