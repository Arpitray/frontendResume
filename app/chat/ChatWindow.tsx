"use client";

import { useState, useRef, useEffect } from "react";
import { askQuestion } from "@/src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Sparkles, ArrowRight } from "lucide-react";

interface Message {
    role: "user" | "ai";
    text: string;
}

export default function ChatWindow({ resumeId }: { resumeId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { accessToken } = useAuthStore();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    function cleanAIResponse(text: string): string {
        return text
            .replace(/\[Chunk\s+\d+(?:,\s*Chunk\s+\d+)*\]/gi, '')
            .replace(/\[\s*\w+\s*\d+(?:,\s*\w+\s*\d+)*\s*\]/g, '')
            .replace(/[ \t]+/g, ' ')
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
            const res = await askQuestion(resumeId, input, accessToken!);
            const cleanedText = cleanAIResponse(res.result);
            const aiMsg: Message = { role: "ai", text: cleanedText };
            setMessages((m) => [...m, aiMsg]);
        } catch (err) {
            console.error(err);
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
        <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-5xl mx-auto bg-background/60 backdrop-blur-2xl relative overflow-hidden font-sans border border-border/40 rounded-[2rem] shadow-2xl">
            
            {/* Header */}
            <div className="px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/30 flex items-center justify-between z-20 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-foreground text-lg tracking-tight flex items-center gap-2">
                            AI Consultant
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        </h1>
                        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                            Resume Analysis Session
                        </p>
                    </div>
                </div>
                <div className="hidden sm:flex px-4 py-1.5 bg-secondary/50 rounded-full text-[11px] font-mono font-medium text-muted-foreground tracking-wider uppercase border border-border/50">
                    Session ID: {resumeId.slice(0, 8)}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scroll-smooth z-10 custom-scrollbar pb-32">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                    
                    {/* Empty State */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-12 sm:py-20 animate-fade-in relative">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none overflow-hidden">
                                <span className="text-[25vw] font-bold tracking-tighter leading-none">AI</span>
                            </div>

                            <div className="relative z-10 space-y-8 w-full">
                                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
                                    <Bot className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight leading-tight">
                                    How can I elevate <br className="hidden sm:block" />
                                    <span className="text-muted-foreground">your career profile?</span>
                                </h3>
                                <p className="max-w-md mx-auto text-base text-muted-foreground font-light leading-relaxed">
                                    I've analyzed your resume. Ask me to summarize your experience, identify skill gaps, or conduct a mock interview.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mx-auto pt-8">
                                    {[
                                        "Summarize my core strengths", 
                                        "What skills am I missing?", 
                                        "Suggest impactful improvements", 
                                        "Conduct a mock interview"
                                    ].map((q) => (
                                        <button 
                                            key={q} 
                                            onClick={() => setInput(q)} 
                                            className="group flex items-center justify-between p-5 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left text-sm font-medium text-foreground/80 hover:text-foreground hover:shadow-md"
                                        >
                                            <span>{q}</span>
                                            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message Bubbles */}
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
                        >
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
                                m.role === "user" 
                                    ? "bg-foreground text-background border-foreground" 
                                    : "bg-primary/10 text-primary border-primary/20"
                            }`}>
                                {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>

                            {/* Bubble */}
                            <div
                                className={`
                                max-w-[80%] sm:max-w-[75%] px-6 py-5 rounded-3xl text-[15px] leading-relaxed shadow-sm
                                ${m.role === "user"
                                        ? "bg-foreground text-background rounded-tr-sm font-medium"
                                        : "bg-card/80 backdrop-blur-sm border border-border/60 rounded-tl-sm text-foreground/90"
                                    }
                            `}
                            >
                                {m.role === "user" ? (
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                ) : (
                                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-headings:font-medium prose-a:text-primary prose-li:marker:text-primary prose-ul:my-2 prose-li:my-0 prose-strong:font-semibold prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {m.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {loading && (
                        <div className="flex gap-4 flex-row animate-fade-in">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-card/80 backdrop-blur-sm border border-border/60 px-6 py-5 rounded-3xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Floating Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-20 pb-6 px-4 sm:px-8 z-20 pointer-events-none">
                <div className="max-w-3xl mx-auto relative pointer-events-auto">
                    <div className="relative flex items-end gap-2 bg-card/90 backdrop-blur-xl border border-border/60 rounded-[2rem] p-2 shadow-xl focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
                        <textarea
                            className="flex-1 min-h-[44px] max-h-[150px] py-3 px-4 bg-transparent border-none focus:ring-0 resize-none text-base text-foreground placeholder:text-muted-foreground/50 font-light leading-relaxed custom-scrollbar focus:outline-none"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your resume..."
                            disabled={loading}
                            rows={1}
                        />
                        <button
                            className={`
                            flex-shrink-0 p-3 rounded-full flex items-center justify-center transition-all duration-300 mb-1 mr-1
                            ${!input.trim() || loading
                                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-md"
                                }
                        `}
                            onClick={send}
                            disabled={!input.trim() || loading}
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-[0.2em] opacity-50">
                        AI can make mistakes. Verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
