import type { Metadata } from "next";
import AdminLogin from "@/app/admin/components/AdminLogin";
import AdminNav from "@/app/admin/components/AdminNav";
import AdsDashboard from "@/app/ads/AdsDashboard";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getAdsEventReports, getAdsSummary } from "@/lib/ads-db";
import { resolveAdsPageFilters } from "@/lib/ads-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ads",
  description: "DeSciNYC paid-social performance dashboard.",
};

export default async function AdsPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#060807] px-4 py-12 text-white">
        <AdminLogin />
      </main>
    );
  }

  const eventReports = await getAdsEventReports();
  const filters = resolveAdsPageFilters(eventReports.events, eventReports.range, (await searchParams) || {});
  const summary = await getAdsSummary(filters);

  return (
    <>
      <AdminNav active="ads" />
      <AdsDashboard initialSummary={summary} initialEventReports={eventReports} />
    </>
  );
}
