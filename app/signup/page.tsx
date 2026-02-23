"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../../src/store/authStore";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one digit.";
  return null;
}

export default function SignUpPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    try {
      await register(email, password, name);
      router.push("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h1>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Begin your journey
              </p>
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
                    htmlFor="name"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-secondary/20 px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
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
                  <label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-border bg-secondary/20 px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground/60 ml-1 mt-1">
                    Min 8 chars · 1 uppercase · 1 digit
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-lg bg-foreground text-background py-3.5 text-sm font-bold tracking-widest uppercase hover:bg-foreground/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating account…" : "Sign Up"}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-foreground hover:text-primary transition-colors border-b border-muted-foreground/30 hover:border-primary pb-0.5"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
