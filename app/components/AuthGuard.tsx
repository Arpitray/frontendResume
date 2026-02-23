"use client";

import { useAuthStore } from "../../src/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * High-performance Auth Guard component.
 * It waits for the auth system to initialize, then checks if a user exists.
 * If not, it gracefully redirects to the signup page while showing
 * a professional "system loading" or "unauthorized" placeholder.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isInitialized, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect if we are SURE we aren't logged in (initialization complete)
    // and we aren't already on an auth page (prevent infinite loops)
    if (isInitialized && !user && !pathname.includes("/login") && !pathname.includes("/signup")) {
      router.replace("/signup");
    }
  }, [isInitialized, user, router, pathname]);

  // Show nothing or a skeleton while determining auth status
  if (!isInitialized || (isLoading && !user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-pulse">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
          Verifying Identity
        </p>
      </div>
    );
  }

  // If we've initialized and still have no user, show a brief redirection message
  // to avoid a "flash" of protected content before the useEffect redirect kicks in.
  if (!user && !pathname.includes("/login") && !pathname.includes("/signup")) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                Redirecting to secure portal...
            </p>
        </div>
    );
  }

  return <>{children}</>;
}
