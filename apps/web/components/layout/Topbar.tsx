"use client";

import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut, Bell, Search } from "lucide-react";

export function Topbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-6">
      {/* Left: Search */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--muted-foreground)] w-72">
          <Search className="h-4 w-4 shrink-0" />
          <span className="text-[13px]">Search...</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent-orange)] ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-[var(--border)]" />

        {/* User profile */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <>
              <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--muted)]" />
              <div className="hidden sm:block space-y-1.5">
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--muted)]" />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[#7C3AED] text-xs font-semibold text-white shadow-sm">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {session?.user?.email || ""}
                </p>
              </div>
            </>
          )}
          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-red-50 hover:text-[var(--destructive)]"
            title="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
