import type { Metadata } from "next";
import AdminLogin from "@/app/admin/components/AdminLogin";
import AdminNav from "@/app/admin/components/AdminNav";
import AdsDashboard from "@/app/ads/AdsDashboard";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getAdsSummary } from "@/lib/ads-db";
import { defaultAdsDateRange } from "@/lib/ads-utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ads",
  description: "DeSciNYC paid-social performance dashboard.",
};

export default async function AdsPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#060807] px-4 py-12 text-white">
        <AdminLogin />
      </main>
    );
  }

  const range = defaultAdsDateRange();
  const summary = await getAdsSummary({
    ...range,
    platform: "all",
  });

  return (
    <>
      <AdminNav active="ads" />
      <AdsDashboard initialSummary={summary} />
    </>
  );
}
