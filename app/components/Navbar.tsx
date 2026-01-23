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
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-16 py-6 bg-background/90 backdrop-blur-md transition-all duration-300 border-b border-border/10">
            {/* Logo Area */}
            <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2 group">
                    {/* Minimal Monogram */}
                    <div className="w-8 h-8 flex items-center justify-center border border-primary text-primary text-xs font-semibold tracking-tighter hover:bg-primary hover:text-background transition-colors">
                        AI
                    </div>
                    <span className="text-sm font-semibold tracking-[0.25em] uppercase text-foreground">
                        Resume
                    </span>
                </Link>
            </div>

            {/* Centered Navigation - Editorial Style */}
            <div className="hidden md:flex items-center gap-10 text-[11px] font-bold tracking-[0.15em] uppercase text-foreground/70">
                <Link href="/match" className="hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">Analysis</Link>
                <Link href="/interview" className="hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">Interview</Link>
                <Link href="#" className="hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">About</Link>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6">
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest"
                        aria-label="Toggle Theme"
                    >
                        {theme === "dark" ? "Light" : "Dark"}
                    </button>
                )}
                 <Link href="/signin" className="hidden lg:block text-xs font-bold tracking-[0.15em] uppercase bg-foreground text-background px-5 py-2 hover:bg-foreground/80 transition-colors">
                    Login
                </Link>
            </div>
        </nav>
    );
}
