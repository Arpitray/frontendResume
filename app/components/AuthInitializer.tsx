"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../src/store/authStore";

/**
 * Renders nothing — purely triggers session restoration on first mount.
 * Place this once inside the root layout so it runs on every page load.
 * It reads the persisted refresh token from localStorage and silently
 * exchanges it for a fresh access token, restoring the user session
 * without requiring a new login.
 */
export default function AuthInitializer() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}
