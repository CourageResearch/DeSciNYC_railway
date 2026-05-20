"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded"
    >
      Logout
    </button>
  );
}
