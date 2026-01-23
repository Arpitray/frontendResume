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
        <div className="flex flex-col h-screen w-full bg-background relative overflow-hidden font-sans">

            {/* Header */}
            <div className="px-8 py-5 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between z-20 sticky top-0">
                <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground font-serif font-bold italic border border-border">
                        Ra
                    </div>
                    <div>
                        <h1 className="font-medium text-foreground text-lg leading-tight">Resume Assistant</h1>
                        <p className="text-xs text-muted-foreground font-light">
                            AI-Powered Contextual Analysis
                        </p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-secondary rounded-full text-[10px] font-mono font-medium text-muted-foreground tracking-wider uppercase">
                   ID: {resumeId.slice(0, 6)}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scroll-smooth z-10 custom-scrollbar bg-background">
                <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-fade-in relative">
                            {/* Decorative Background Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                                <span className="text-[20vw] font-bold tracking-tighter">AI</span>
                            </div>
                            
                            <div className="relative z-10 space-y-8">
                                <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-primary/80 border-b border-primary/20 pb-1">
                                    Consultation Mode
                                </span>
                                <h3 className="text-display text-4xl md:text-6xl font-medium text-foreground tracking-tight leading-none">
                                    How can I <br/><span className="text-muted-foreground">assist you?</span>
                                </h3>
                                <p className="max-w-md mx-auto text-lg text-muted-foreground font-light leading-relaxed">
                                    Ask me anything about your experience, skills, or how to improve your resume.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mx-auto pt-8">
                                    {["Summarize my experience", "What skills are missing?", "Suggest improvements", "Mock interview me"].map((q) => (
                                        <button key={q} onClick={() => setInput(q)} className="p-6 bg-background border border-border/40 hover:border-primary/50 text-foreground/70 hover:text-foreground transition-all text-left text-sm tracking-wide uppercase hover:shadow-lg group">
                                            <span className="group-hover:translate-x-1 inline-block transition-transform">+ {q}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                        >
                            <div
                                className={`
                                max-w-[85%] sm:max-w-[700px] px-8 py-6 rounded-3xl text-[15px] leading-relaxed shadow-sm
                                ${m.role === "user"
                                        ? "bg-foreground text-background rounded-br-sm"
                                        : "bg-card border border-border rounded-bl-sm"
                                    }
                            `}
                            >
                                <p className="whitespace-pre-wrap font-light">{m.text}</p>
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-card border border-border px-6 py-4 rounded-3xl rounded-bl-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input - Editorial Style */}
            <div className="bg-background/80 backdrop-blur-md border-t border-border/10 z-20 pb-10 pt-6">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex gap-4 items-end relative bg-background border-b border-foreground/20 focus-within:border-foreground transition-colors pb-2">
                        <textarea
                            className="flex-1 min-h-[40px] max-h-[150px] py-2 px-0 bg-transparent border-none focus:ring-0 resize-none text-xl text-foreground placeholder:text-muted-foreground/30 font-light leading-relaxed"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your inquiry..."
                            disabled={loading}
                            rows={1}
                        />
                        <button
                            className={`
                            p-3 mb-1 text-sm font-bold uppercase tracking-widest transition-all duration-300
                            ${!input.trim() || loading
                                    ? "text-muted-foreground cursor-not-allowed"
                                    : "text-primary hover:text-foreground"
                                }
                        `}
                            onClick={send}
                            disabled={!input.trim() || loading}
                        >
                            Send
                        </button>
                    </div>
                     <p className="text-center text-[9px] text-muted-foreground mt-4 uppercase tracking-[0.2em] opacity-40">AI Generated Content</p>
                </div>
            </div>
        </div>
    );
}
