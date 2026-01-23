"use client";

import { useSearchParams } from "next/navigation";
import ChatWindow from "./ChatWindow";
import Navbar from "@/app/components/Navbar";
import { Suspense } from "react";
import Link from "next/link";

function ChatContent() {
    const params = useSearchParams();
    const resumeId = params.get("resume_id");

    if (!resumeId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 border border-foreground/10 flex items-center justify-center">
                    <span className="text-2xl">!</span>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-[0.2em]">Missing Context</h3>
                    <p className="text-muted-foreground font-light max-w-sm mx-auto">
                        No active resume found for analysis. Please upload a document to begin.
                    </p>
                </div>
                <Link href="/" className="px-8 py-3 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
                    Return Home
                </Link>
            </div>
        );
    }

    return <ChatWindow resumeId={resumeId} />;
}

export default function ChatPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col pt-24 max-w-7xl mx-auto w-full px-4 lg:px-8">
                <Suspense fallback={<div className="flex items-center justify-center h-full text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading System...</div>}>
                    <ChatContent />
                </Suspense>
            </main>
        </div>
    );
}
