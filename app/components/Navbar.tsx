"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar() {
    const pathname = usePathname();
    const isChat = pathname?.includes("/chat");
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/60 border-b border-border/40 supports-[backdrop-filter]:bg-background/30 transition-colors duration-300">
            <div className="flex items-center gap-2">
                <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <span>ResumeAI</span>
                </Link>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                <Link href="/match" className="hover:text-foreground transition-colors">Match Job</Link>
                <Link href="#" className="hover:text-foreground transition-colors">Features</Link>
                <Link href="#" className="hover:text-foreground transition-colors">How it works</Link>
                <Link href="#" className="hover:text-foreground transition-colors">Pricing</Link>
            </div>

            <div className="flex items-center gap-3">
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="p-2 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-all"
                        aria-label="Toggle Dark Mode"
                    >
                        {theme === "dark" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                            </svg>
                        )}
                    </button>
                )}

                <Link
                    href="https://github.com"
                    target="_blank"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary/50 hover:bg-secondary rounded-full transition-all"
                >
                    GitHub
                </Link>
                {!isChat && (
                    <Link
                        href="#upload"
                        className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-full hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                    >
                        Get Started
                    </Link>
                )}
            </div>
        </nav>
    );
}
