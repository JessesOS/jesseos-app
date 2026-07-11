import type { DashboardData } from "@/lib/dashboard-data";
import { DashboardClient } from "./dashboard-client";

export function DashboardLayout({ data }: { data: DashboardData }) {
  return <DashboardClient data={data} />;
}
