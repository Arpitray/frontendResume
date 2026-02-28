"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuthStore } from "../../src/store/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface Props {
  redirectTo?: string;
}

export default function GoogleLoginButton({ redirectTo = "/" }: Props) {
  const { loginWithGoogle } = useAuthStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Don't render if Google OAuth isn't configured in this environment
  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    setError(null);
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError("Google did not return credentials. Please try again.");
      return;
    }
    try {
      await loginWithGoogle(idToken);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  return (
    <div className="w-full">
      {error && (
        <p className="mb-2 text-xs text-destructive text-center">{error}</p>
      )}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Google sign-in was cancelled or failed.")}
        width="100%"
        text="continue_with"
        shape="rectangular"
        theme="outline"
        logo_alignment="center"
      />
    </div>
  );
}
