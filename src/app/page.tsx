import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getDashboardData } from "@/lib/supabase/dashboard";
import { connection } from "next/server";

export default async function Home() {
  await connection();

  const dashboardData = await getDashboardData();

  return <DashboardLayout data={dashboardData} />;
}
