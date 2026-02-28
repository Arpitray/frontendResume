"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../../src/store/authStore";

export default function GitHubCallback() {
  const router = useRouter();
  const { loginWithGithub } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    // The state param carries the intended redirect destination set in GitHubLoginButton
    const redirectTo = params.get("state") ?? "/";

    if (!code) {
      setError("No authorization code received from GitHub. Please try again.");
      return;
    }

    (async () => {
      try {
        await loginWithGithub(code);
        router.replace(redirectTo);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "GitHub sign-in failed. Please try again."
        );
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border/40 p-10 text-center shadow-lg">
          <p className="text-sm text-destructive mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="rounded-lg bg-foreground text-background px-6 py-2.5 text-sm font-semibold hover:bg-foreground/90 transition-all"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        {/* Spinner */}
        <svg
          className="h-8 w-8 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm">Signing you in via GitHub…</p>
      </div>
    </div>
  );
}
