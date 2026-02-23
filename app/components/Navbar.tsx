"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../src/store/authStore";

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { user, logout } = useAuthStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleLogout() {
        await logout();
        router.push("/");
    }

    // Derive initials for the avatar badge
    const initials = user?.name
        ? user.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
        : "";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-16 py-6 bg-background/90 backdrop-blur-md transition-all duration-300 border-b border-border/10">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 flex items-center justify-center border border-primary text-primary text-xs font-semibold tracking-tighter hover:bg-primary hover:text-background transition-colors">
                        AI
                    </div>
                    <span className="text-sm font-semibold tracking-[0.25em] uppercase text-foreground">
                        Resume
                    </span>
                </Link>
            </div>

            {/* Centre Nav */}
            <div className="hidden md:flex items-center gap-10 text-[11px] font-bold tracking-[0.15em] uppercase text-foreground/70">
                <Link href="/match" className="hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">Analysis</Link>
                <Link href="/interview" className="hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">Interview</Link>
                <Link href="/about" className="hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">About</Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-6">
                {/* Theme toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest"
                        aria-label="Toggle Theme"
                    >
                        {theme === "dark" ? "Light" : "Dark"}
                    </button>
                )}

                {/* Auth section — only render after hydration to avoid mismatch */}
                {mounted && (
                    user ? (
                        <div className="flex items-center gap-4">
                            {/* Avatar badge */}
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-primary">{initials}</span>
                                </div>
                                <span className="hidden lg:block text-xs font-semibold tracking-wide text-foreground">
                                    {user.name.split(" ")[0]}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-foreground pb-0.5"
                            >
                                Log Out
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link
                                href="/login"
                                className="hidden lg:block text-xs font-bold tracking-[0.15em] uppercase text-foreground hover:text-primary transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="hidden lg:block text-xs font-bold tracking-[0.15em] uppercase bg-foreground text-background px-5 py-2 hover:bg-foreground/80 transition-colors"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )
                )}
            </div>
        </nav>
    );
}
