import Link from "next/link";
import { ChartNoAxesCombined, LayoutDashboard, ShieldCheck } from "lucide-react";
import LogoutButton from "./LogoutButton";

type AdminSection = "admin" | "ads";

type AdminNavProps = {
  active: AdminSection;
};

const adminSections = [
  {
    id: "admin",
    href: "/admin",
    label: "Admin dashboard",
    mobileLabel: "Admin",
    icon: LayoutDashboard,
  },
  {
    id: "ads",
    href: "/ads",
    label: "Ads dashboard",
    mobileLabel: "Ads",
    icon: ChartNoAxesCombined,
  },
] as const;

export default function AdminNav({ active }: AdminNavProps) {
  return (
    <nav
      aria-label="Admin navigation"
      className="border-b border-[#22362F] bg-[#070B09] text-white"
    >
      <div className="mx-auto flex min-h-14 max-w-[1440px] items-center gap-1 overflow-x-auto px-3 py-2 sm:gap-2 sm:px-4 md:px-6">
        <div className="mr-2 hidden shrink-0 items-center gap-2 border-r border-[#22362F] pr-4 text-xs uppercase tracking-[0.16em] text-[#8BA59B] md:flex">
          <ShieldCheck size={15} aria-hidden="true" />
          Admin console
        </div>

        <div className="flex min-w-max items-center gap-1">
          {adminSections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === active;

            return (
              <Link
                key={section.id}
                href={section.href}
                aria-label={section.label}
                aria-current={isActive ? "page" : undefined}
                className={`group inline-flex h-10 items-center gap-1.5 border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7F171] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B09] sm:gap-2 sm:px-3 sm:text-sm ${
                  isActive
                    ? "border-[#4C6040] bg-[#111913] text-[#D7F171]"
                    : "border-transparent text-[#A9BBB4] hover:border-[#2A3B34] hover:bg-[#0C1310] hover:text-white"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 border transition-colors ${
                    isActive
                      ? "border-[#D7F171] bg-[#D7F171]"
                      : "border-[#62776E] group-hover:border-[#D7F171]"
                  }`}
                />
                <Icon size={16} aria-hidden="true" />
                <span className="sm:hidden">{section.mobileLabel}</span>
                <span className="hidden sm:inline">{section.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="ml-auto shrink-0 pl-1">
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
