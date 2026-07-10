import AdminLogin from "./components/AdminLogin";
import EventAddForm from "./components/EventAddForm";
import EventList from "./components/EventList";
import EmailPreferencesPanel from "./components/EmailPreferencesPanel";
import ImageUpload from "./components/ImageUpload";
import AdminNav from "./components/AdminNav";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getAdminEmailPreferences } from "@/lib/admin-email-preferences";

export const dynamic = "force-dynamic";

export default async function AdminUploadPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const emailPreferences = await getAdminEmailPreferences();

  return (
    <>
      <AdminNav active="admin" />
      <main className="max-w-6xl mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <EmailPreferencesPanel
          initialPreferences={emailPreferences.preferences}
          databaseConfigured={emailPreferences.databaseConfigured}
        />
        <EventAddForm />
        <EventList />
        <ImageUpload />
      </main>
    </>
  );
}
