import AdminLogin from "./components/AdminLogin";
import EventAddForm from "./components/EventAddForm";
import EventList from "./components/EventList";
import ImageUpload from "./components/ImageUpload";
import LogoutButton from "./components/LogoutButton";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminUploadPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <LogoutButton />
      </div>
      <EventAddForm />
      <EventList />
      <ImageUpload />
    </div>
  );
}
