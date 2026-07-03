"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SidebarDropdownSection } from "@repo/ui/sideBarDropdownSection";
import { toast } from "sonner";
import { useUser } from "@repo/query-hook";
import { useQueryClient } from "@tanstack/react-query";

const navSections = [
  { name: "Dashboard", path: "/admin/dashboard", accessibleRoles: ["admin","staff"] },
  { name: "Users", path: "/admin/users", accessibleRoles: ["admin"] },
  { name: "Properties", path: "/admin/properties", accessibleRoles: ["admin", "staff"] },
  { name: "Leads", path: "/admin/leads", accessibleRoles: ["admin", "staff"] },

  { name: "Geozones", path: "/admin/geo-zones", accessibleRoles: ["admin"] },
  { name: "My-Zones", path: "/admin/geo-zones/my-zones", accessibleRoles: ["staff"] },
];



export default function AdminSidebarClient() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user, isLoading } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return null; // or a loading spinner
  }

  
  const isSectionActive = (children: { path: string }[]) => {
    return children.some(child => pathname === child.path);
  };
  const userRole = user?.role?.toLowerCase();

  // Helper to check if a user has permission for a specific item
  const hasAccess = (accessibleRoles: string[]) => {
    return accessibleRoles.includes(userRole);
  };

  // Filter the sections based on role
  const filteredSections = navSections
    .map((section) => {
      // For top-level links, check role directly
      return section.accessibleRoles && hasAccess(section.accessibleRoles)
        ? section
        : null;
    })
    .filter(Boolean); // Remove the null entries

  return (
    <>
      {/* Mobile Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-50">
        <button
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <h2 className="text-lg font-semibold">
          Welcome, {user?.name?.split(" ")[0]}
        </h2>

        {/* Empty div for flex spacing */}
        <div className="w-10"></div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* remove md:static so navbar is independent of children height  */}
      <nav
        className={`fixed inset-y-0 top-0 left-0 w-64 bg-gray-100 dark:bg-gray-800 p-6 flex flex-col z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:mt-0 mt-16`}

      >
        {/* Hidden on mobile since we have the mobile navbar */}
        <h2 className="hidden md:block text-lg sm:text-xl md:text-2xl font-bold mb-5 md:mb-8">
          Welcome, {user?.name?.split(" ")[0]}
        </h2>

        <div className="flex flex-col space-y-2 text-sm sm:text-base">
          <Link
            href="/admin/notifications"
            className={`inline-flex items-center relative px-4 py-3 rounded-lg transition-all duration-200 ${pathname === "/admin/notifications"
                ? "bg-primary-500 text-white shadow-sm"
                : "text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
          >
            {/* The Base Text Container */}
            <span className="relative">
              Notifications

              {/* 🔥 Move conditional check here: Floating Messenger-style Badge only shows if > 0 */}
              {user.notification > 0 && (
                <span
                  className={`absolute -top-2 -right-4 inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-black rounded-full shadow-sm animate-bounce ring-2 ${pathname === "/admin/notifications"
                      ? "bg-white text-primary-500 ring-primary-500" // Inverts to stand out on the blue button
                      : "bg-red-500 text-white ring-white dark:ring-secondary-900" // Traditional vibrant alert color
                    }`}
                  style={{ animationDuration: '2s' }} // Smoother, non-distracting bounce speed
                >
                  {user.notification > 99 ? "99+" : user.notification}
                </span>
              )}
            </span>
          </Link>
          {filteredSections.map((section) =>
          (
            <Link
              key={section!.path} href={section!.path!}
              onClick={() => setSidebarOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 ${pathname === section!.path
                ? "bg-primary-500 text-white shadow-sm"
                : "text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
                }`}
            >
              {section!.name}
            </Link>
          )
          )}
        </div>

        <div className="mt-auto flex flex-col space-y-3 text-sm">
          <button
            onClick={async () => {
              const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/signout`, {
                method: "POST",
                credentials: "include",
              });
              const data = await res.json();
              if (!res.ok) {
                toast.error(data.message || "Failed to log out");
                return;
              }
              queryClient.clear();
              toast.success(data.message || "Logged out successfully");
              router.replace("/auth/signin");
            }}
            className="px-4 py-2 rounded-lg border border-gray-400 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all duration-200"
          >
            Log Out
          </button>

        </div>
      </nav>
    </>
  );
}