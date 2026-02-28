"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../../src/store/authStore";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-background px-6 pt-24 pb-12">
        <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-500">

          <div className="bg-card p-10 border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl relative overflow-hidden">
            {/* Decorative Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />

            <div className="text-center mb-10 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Access your dashboard
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <GoogleLoginButton redirectTo="/" />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <span className="h-px flex-1 bg-border/40" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">or</span>
              <span className="h-px flex-1 bg-border/40" />
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-secondary/20 px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Password
                    </label>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-secondary/20 px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded-sm border-input text-primary focus:ring-primary bg-background"
                  />
                  <label htmlFor="remember" className="text-muted-foreground">
                    Remember me
                  </label>
                </div>
                <Link
                  href="#"
                  className="font-medium text-primary hover:text-foreground transition-colors hover:underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-foreground text-background py-3.5 text-sm font-bold tracking-widest uppercase hover:bg-foreground/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                First time here?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-foreground hover:text-primary transition-colors border-b border-muted-foreground/30 hover:border-primary pb-0.5"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
