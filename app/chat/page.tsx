"use client";

import { useSearchParams } from "next/navigation";
import ChatWindow from "./ChatWindow";
import { Suspense } from "react";

function ChatContent() {
    const params = useSearchParams();
    const resumeId = params.get("resume_id");

    if (!resumeId) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                    <p className="mb-2">No resume loaded.</p>
                    <a href="/" className="text-primary hover:underline underline-offset-4">Upload a new resume</a>
                </div>
            </div>
        );
    }

    return <ChatWindow resumeId={resumeId} />;
}

export default function ChatPage() {
    return (
        <main className="h-full bg-secondary/10 flex flex-col items-center justify-center">
            <Suspense fallback={<div>Loading...</div>}>
                <ChatContent />
            </Suspense>
        </main>
    );
}
