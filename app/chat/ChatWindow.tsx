"use client";

import { useState, useRef, useEffect } from "react";
import { askQuestion } from "@/src/lib/api";

interface Message {
    role: "user" | "ai";
    text: string;
}

export default function ChatWindow({ resumeId }: { resumeId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    function cleanAIResponse(text: string): string {
        return text
            // Remove citation/chunk references like [Chunk 0], [Chunk 1, Chunk 2], etc.
            .replace(/\[Chunk\s+\d+(?:,\s*Chunk\s+\d+)*\]/gi, '')
            // Remove any other square bracket references
            .replace(/\[\s*\w+\s*\d+(?:,\s*\w+\s*\d+)*\s*\]/g, '')
            // Remove markdown bold formatting (**text** or __text__)
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/__(.+?)__/g, '$1')
            // Remove markdown italic formatting (*text* or _text_)
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/_(.+?)_/g, '$1')
            // Remove markdown headers markers (### Title -> Title)
            .replace(/^#+\s*/gm, '')
            // Remove horizontal rules
            .replace(/^-{3,}/gm, '')
            // Clean up extra spaces but PRESERVE newlines
            .replace(/[ \t]+/g, ' ')
            // Normalize newlines (max 2 consecutive newlines)
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
    }

    async function send() {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: "user", text: input };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await askQuestion(resumeId, input);
            const cleanedText = cleanAIResponse(res.result);
            const aiMsg: Message = { role: "ai", text: cleanedText };
            setMessages((m) => [...m, aiMsg]);
        } catch (err) {
            console.error(err);
            // Optional: Add error message to chat
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    return (
        <div className="flex flex-col h-screen w-full bg-background backdrop-blur-xl shadow-2xl dark:shadow-black/50 border-t border-border/40 overflow-hidden relative">

            {/* Background Blobs for Chat */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-50 dark:opacity-20">
                <div className="absolute top-[-20%] right-[-20%] w-[400px] h-[400px] bg-purple-200 dark:bg-purple-900 rounded-full blur-[60px]"></div>
                <div className="absolute bottom-[-20%] left-[-20%] w-[400px] h-[400px] bg-blue-200 dark:bg-blue-900 rounded-full blur-[60px]"></div>
            </div>

            {/* Header */}
            <div className="px-8 py-5 border-b border-border/40 bg-background/50 backdrop-blur-md flex items-center justify-between z-10 max-w-7xl w-full mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                        AI
                    </div>
                    <div>
                        <h1 className="font-bold text-foreground text-lg leading-tight">Resume Assistant</h1>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-xs font-medium text-muted-foreground">Online & Ready</span>
                        </div>
                    </div>
                </div>
                <div className="px-3 py-1 bg-secondary/50 rounded-full border border-border text-xs font-medium text-muted-foreground">
                    ID: {resumeId.slice(0, 6)}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scroll-smooth z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16 text-center">
                            <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-8">
                                <svg className="w-10 h-10 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-foreground mb-3">Welcome to your Resume Chat</h3>
                            <p className="max-w-md mx-auto text-muted-foreground text-lg">Ask me anything about your experience, skills, or how to improve your resume.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full max-w-2xl">
                                {["Summarize my experience", "What skills are missing?", "Suggest improvements", "Mock interview me"].map((q) => (
                                    <button key={q} onClick={() => setInput(q)} className="p-4 text-base bg-card border border-border hover:border-indigo-500/50 hover:bg-muted/50 rounded-xl text-muted-foreground hover:text-foreground transition-all text-left font-medium">
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div
                                className={`
                                max-w-[800px] px-6 py-4 rounded-2xl text-[15px] leading-7 shadow-sm
                                ${m.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-br-sm shadow-primary/20"
                                        : "bg-card text-card-foreground border border-border rounded-bl-sm shadow-black/5 dark:bg-muted/30"
                                    }
                            `}
                            >
                                <p className="whitespace-pre-wrap">{m.text}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                                <span className="sr-only">AI is typing...</span>
                                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="bg-background/80 backdrop-blur-md border-t border-border/40 z-20">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex gap-3 items-end relative bg-secondary/50 p-2 rounded-2xl border border-transparent focus-within:border-indigo-500/30 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-500/20 transition-all">
                        <textarea
                            className="flex-1 min-h-[50px] max-h-[150px] p-3 bg-transparent border-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground/70"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your question..."
                            disabled={loading}
                            rows={1}
                        />
                        <button
                            className={`
                            p-3 rounded-xl transition-all duration-200 shadow-sm mb-1 mr-1
                            ${!input.trim() || loading
                                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                    : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/25"
                                }
                        `}
                            onClick={send}
                            disabled={!input.trim() || loading}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
