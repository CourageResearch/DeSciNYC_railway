import AdminLogin from "./components/AdminLogin";
import EventAddForm from "./components/EventAddForm";
import EventList from "./components/EventList";
import EmailPreferencesPanel from "./components/EmailPreferencesPanel";
import ImageUpload from "./components/ImageUpload";
import LogoutButton from "./components/LogoutButton";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getAdminEmailPreferences } from "@/lib/admin-email-preferences";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUploadPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const emailPreferences = await getAdminEmailPreferences();

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/ads"
            className="rounded bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
          >
            Ads dashboard
          </Link>
          <LogoutButton />
        </div>
      </div>
      <EmailPreferencesPanel
        initialPreferences={emailPreferences.preferences}
        databaseConfigured={emailPreferences.databaseConfigured}
      />
      <EventAddForm />
      <EventList />
      <ImageUpload />
    </div>
  );
}
