"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PortalSidebar } from "./PortalSidebar";
import { PortalRole } from "@/db/schema";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  role: PortalRole;
}

interface OriginalUser {
  id: string;
  email: string;
  name: string | null;
}

interface PortalLayoutWrapperProps {
  children: React.ReactNode;
}

export function PortalLayoutWrapper({ children }: PortalLayoutWrapperProps) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState<OriginalUser | null>(null);
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/portal/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setIsImpersonating(data.isImpersonating || false);
          setOriginalUser(data.originalUser || null);
        } else {
          // Not authorized, redirect to login
          router.push("/portal/login");
        }
      } catch {
        router.push("/portal/login");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const handleStopImpersonating = async () => {
    setIsStoppingImpersonation(true);
    try {
      const res = await fetch("/api/portal/impersonate", { method: "DELETE" });
      if (res.ok) {
        // Refresh to load the original user's session
        window.location.href = "/portal";
      }
    } catch (error) {
      console.error("Failed to stop impersonating:", error);
    } finally {
      setIsStoppingImpersonation(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/portal/login" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="text-sm font-medium">
                Impersonating {user?.name || user?.email}
                {originalUser && (
                  <span className="opacity-75">
                    {" "}(logged in as {originalUser.name || originalUser.email})
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleStopImpersonating}
              disabled={isStoppingImpersonation}
              className="px-3 py-1 text-sm font-medium bg-white text-amber-600 rounded hover:bg-amber-50 disabled:opacity-50"
            >
              {isStoppingImpersonation ? "Stopping..." : "Stop Impersonating"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isImpersonating ? "top-10" : ""}`}
      >
        <PortalSidebar
          role={user.role}
          userName={user.name}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Main content */}
      <div className={`lg:pl-64 ${isImpersonating ? "pt-10" : ""}`}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <span className="font-semibold text-gray-900">Agent Portal</span>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
