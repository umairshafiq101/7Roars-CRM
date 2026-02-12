"use client";

import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";

export function Topbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-6">
      <div>
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
          Welcome back
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          {isPending ? (
            <>
              <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--muted)]" />
              <div className="hidden sm:block space-y-1">
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--muted)]" />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-medium text-white">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{session?.user?.name || "User"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {session?.user?.email || ""}
                </p>
              </div>
            </>
          )}
          <button
            onClick={handleSignOut}
            className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--destructive)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
