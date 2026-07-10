"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <button
      type="button"
      aria-label="Log out"
      onClick={handleLogout}
      className="inline-flex h-10 items-center gap-2 border border-[#2A3B34] bg-transparent px-2 text-xs text-[#A9BBB4] transition-colors hover:border-[#724333] hover:bg-[#190D0A] hover:text-[#FFB199] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7F171] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B09] sm:px-3 sm:text-sm"
    >
      <LogOut size={15} aria-hidden="true" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
