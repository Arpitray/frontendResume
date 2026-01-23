"use client";

import { useEffect, useRef, useState } from "react";
import { uploadJob } from "@/src/lib/api";
import Navbar from "@/app/components/Navbar";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function InterviewPage() {
    const [resumeId, setResumeId] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobDescription, setJobDescription] = useState("");

    const [uploading, setUploading] = useState(false);
    const [uploadingJob, setUploadingJob] = useState(false);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [question, setQuestion] = useState("");
    const [transcript, setTranscript] = useState("");
    const [log, setLog] = useState<any[]>([]);
    const [listening, setListening] = useState(false);
    const [score, setScore] = useState(0);
    const [latestFeedback, setLatestFeedback] = useState<any>(null);

    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef(""); // To access latest transcript in closures

    // Sync ref with state
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    // ---------------- SPEECH SETUP ----------------

    useEffect(() => {
        if (typeof window !== "undefined" && !("webkitSpeechRecognition" in window)) {
            alert("Please use Chrome for voice interview mode");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const rec = new SpeechRecognition();

        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        // Store the text that existed before this specific speech session started
        let sessionStartText = "";

        rec.onstart = () => {
            console.log("🎤 Microphone started");
            setListening(true);
            sessionStartText = transcriptRef.current;
        };

        rec.onend = () => {
            console.log("🎤 Microphone stopped");
            setListening(false);
        };

        rec.onresult = (e: any) => {
            let sessionText = "";
            // Combine all results from the current speech session
            for (let i = 0; i < e.results.length; i++) {
                sessionText += e.results[i][0].transcript;
            }

            // Allow appending to existing text (handling space if needed)
            const spacer = sessionStartText && sessionText ? " " : "";
            setTranscript(sessionStartText + spacer + sessionText);
        };

        rec.onerror = (e: any) => {
            console.error("🎤 Speech recognition error:", e.error);
            setListening(false);

            if (e.error === "not-allowed") {
                alert("Microphone access blocked. Please allow permissions.");
            } else if (e.error === "network") {
                alert("Voice recognition network error. Please check your internet connection or try typing your answer.");
            } else if (e.error === "no-speech") {
                // Ignore no-speech, just let it stop or retry if you wanted
                return;
            } else {
                // alert("Speech recognition error: " + e.error);
                // Silent fail for common errors to avoid annoying popups
            }
        };

        recognitionRef.current = rec;

        return () => {
            rec.abort();
        };
    }, []);

    // ---------------- AI VOICE ----------------

    function speak(text: string) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
    }

    // ---------------- FILE UPLOAD ----------------

    async function uploadResume(file: File) {
        setUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API}/upload-resume`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        setResumeId(data.stored_as);

        setUploading(false);
    }

    async function handleJobUpload() {
        if (!jobDescription.trim()) return;
        setUploadingJob(true);
        try {
            const data = await uploadJob(jobDescription);
            setJobId(data.job_id);
        } catch (err) {
            console.error(err);
            alert("Job upload failed");
        } finally {
            setUploadingJob(false);
        }
    }

    // ---------------- START INTERVIEW ----------------

    async function startInterview() {
        if (!resumeId) {
            alert("Upload resume first");
            return;
        }

        if (!jobId) {
            alert("Submit job description first");
            return;
        }

        console.log("🎯 Starting interview with:", {
            resume_id: resumeId,
            job_id: jobId
        });

        try {
            const res = await fetch(`${API}/interview/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume_id: resumeId,
                    job_id: jobId
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("❌ Backend error:", errorText);
                alert("Backend error. Check console.");
                return;
            }

            const data = await res.json();

            if (!data.session_id || !data.question) {
                console.error("❌ Invalid response:", data);
                alert("Invalid server response");
                return;
            }

            setSessionId(data.session_id);
            setQuestion(data.question);

            speak(data.question);
        } catch (err) {
            console.error("❌ Network error:", err);
            alert("Cannot reach backend");
        }
    }


    // ---------------- SUBMIT ANSWER ----------------

    async function submitAnswer() {
        if (!sessionId || !transcript) return;

        recognitionRef.current.stop();
        setListening(false);

        const res = await fetch(`${API}/interview/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                question,
                answer: transcript
            })
        });

        const data = await res.json();

        setLog(l => [
            ...l,
            {
                q: question,
                a: transcript,
                feedback: data.feedback,
                scores: data.scores
            }
        ]);

        setTranscript("");
        setQuestion(data.next_question);

        // Handle scores from backend
        if (data.scores) {
            setLatestFeedback(data.scores);
            // Calculate a composite score change - assuming scores are 1-10
            // Example: (Correctness + Clarity + Depth) / 3
            const avgScore = (
                (data.scores.correctness || 0) +
                (data.scores.clarity || 0) +
                (data.scores.depth || 0)
            ) / 3;

            // Add to total cumulative score
            setScore(s => s + Math.round(avgScore * 10)); // Scaling up for display
        } else if (data.score_delta) {
            // Fallback for older backend version
            const delta = Number(data.score_delta);
            if (!isNaN(delta)) {
                setScore(s => s + delta);
            }
        }

        speak(data.next_question);
    }

    // ---------------- MIC ----------------

    function toggleMic() {
        if (!recognitionRef.current) return;

        if (listening) {
            recognitionRef.current.stop();
            setListening(false);
        } else {
            recognitionRef.current.start();
            setListening(true);
        }
    }

    // ---------------- UI ----------------

    return (
        <div className="flex flex-col min-h-screen relative overflow-x-hidden bg-background text-foreground transition-colors duration-300">
            <Navbar />

            {/* Editorial Background - Clean Paper-like */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none bg-background">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[150px] opacity-40"></div>
                {/* Thin architectural line */}
                <div className="absolute left-[8%] top-0 w-[1px] h-full bg-border/20 hidden lg:block"></div>
            </div>

            <main className="flex-1 pt-32 pb-12 px-6 max-w-4xl mx-auto w-full relative z-10 animate-fade-in">

                <div className="text-center space-y-6 mb-20">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-primary/80 border-b border-primary/20 pb-1 inline-block">
                        Simulation Module
                    </span>
                    <h1 className="text-display font-medium text-foreground tracking-tight leading-[1]">
                        The Interview<br /><span className="text-muted-foreground opacity-60">Practice Suite</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
                        Refine your presence through real-time AI simulation.
                    </p>
                </div>

                {/* UPLOAD RESUME */}
                {!resumeId && (
                    <div className="p-12 bg-background border border-border/60 rounded-sm text-center max-w-2xl mx-auto relative group">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-foreground/10 group-hover:bg-primary/50 transition-colors duration-500"></div>
                        <div className="w-16 h-16 bg-secondary text-foreground flex items-center justify-center mx-auto mb-6 border border-border">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-medium mb-3">Upload Resume</h2>
                        <p className="text-muted-foreground mb-8 font-light">We need your resume to tailor questions specifically for your background.</p>

                        <label className="relative inline-flex items-center justify-center px-10 py-4 overflow-hidden font-medium text-background bg-foreground rounded-full transition-all hover:opacity-90 cursor-pointer hover:shadow-lg hover:-translate-y-1">
                            <span className="relative flex items-center gap-3">
                                <span>Choose PDF</span>
                            </span>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={e => {
                                    if (e.target.files?.[0]) uploadResume(e.target.files[0]);
                                }}
                                className="hidden"
                            />
                        </label>

                        {uploading && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-primary">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">Processing...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* JOB DESCRIPTION */}
                {resumeId && !jobId && (
                    <div className="p-10 bg-card border border-border/60 luxury-shadow rounded-[2rem] max-w-2xl mx-auto">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-foreground">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-medium">Target Role</h2>
                                <p className="text-sm text-muted-foreground">What job are you interviewing for?</p>
                            </div>
                        </div>

                        <textarea
                            className="w-full p-6 bg-secondary/30 border border-border rounded-xl text-foreground mb-8 h-48 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none font-light placeholder:text-muted-foreground/50"
                            placeholder="Paste the full job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={handleJobUpload}
                                disabled={uploadingJob || !jobDescription.trim()}
                                className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                            >
                                {uploadingJob ? "Setting Context..." : "Continue →"}
                            </button>
                        </div>
                    </div>
                )}

                {/* START BUTTON */}
                {resumeId && jobId && !sessionId && (
                    <div className="text-center">
                        <button
                            onClick={startInterview}
                            className="group relative inline-flex items-center justify-center px-12 py-6 font-medium text-lg text-background bg-foreground rounded-full overflow-hidden transition-all hover:scale-[1.02] shadow-xl hover:shadow-2xl"
                        >
                            <span className="relative flex items-center gap-3 z-10">
                                <span>Start Session</span>
                            </span>
                            <div className="absolute inset-0 bg-primary/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                        <p className="mt-4 text-sm text-muted-foreground">Make sure your microphone is enabled</p>
                    </div>
                )}

                {/* INTERVIEW SESSION */}
                {sessionId && (
                    <div className="space-y-8">
                        {/* Status Bar */}
                        <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">Live</span>
                            </div>

                            <div className="flex items-center gap-6">
                                {latestFeedback && (
                                    <div className="hidden md:flex items-center gap-6 text-sm pr-6 border-r border-border">
                                        <div className="text-center">
                                            <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Correctness</span>
                                            <span className="font-semibold text-foreground">{latestFeedback.correctness}/10</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Clarity</span>
                                            <span className="font-semibold text-foreground">{latestFeedback.clarity}/10</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block text-right">Session Score</span>
                                    <span className="text-xl font-medium text-primary block text-right">
                                        {isNaN(score) ? 0 : score}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Question */}
                        <div className="relative p-10 bg-secondary/30 border border-border rounded-[2rem] overflow-hidden">
                            <span className="inline-block mb-4 text-xs font-bold text-primary uppercase tracking-widest">AI Interviewer</span>
                            <p className="text-2xl md:text-3xl font-serif text-foreground leading-snug">
                                "{question}"
                            </p>
                        </div>

                        {/* User Answer */}
                        <div className="bg-card border border-border rounded-[2rem] p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/30 transition-all">
                            <div className="rounded-[1.5rem] p-6 min-h-[160px] bg-background">
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder="Your answer will appear here as you speak..."
                                    className="w-full h-full bg-transparent border-none p-0 text-lg text-foreground placeholder:text-muted-foreground/40 focus:ring-0 resize-none font-light leading-relaxed"
                                />
                            </div>

                            <div className="flex gap-3 p-2">
                                <button
                                    onClick={toggleMic}
                                    className={`flex-1 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ${listening
                                        ? "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-transparent"
                                        }`}
                                >
                                    {listening ? (
                                        <>
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                            Stop Mic
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                                            Start Mic
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={submitAnswer}
                                    disabled={!transcript.trim()}
                                    className="flex-1 py-4 bg-foreground text-background hover:opacity-90 rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    Submit Response
                                </button>
                            </div>
                        </div>

                        {/* History */}
                        {log.length > 0 && (
                            <div className="mt-16 pt-8 border-t border-border">
                                <h3 className="text-lg font-medium mb-8">Session Transcript</h3>
                                <div className="space-y-8">
                                    {log.map((l, i) => (
                                        <div key={i} className="group relative pl-8 border-l-2 border-border/50 hover:border-primary/50 transition-colors pb-8 last:pb-0">
                                            <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-border group-hover:bg-primary transition-colors"></div>

                                            <div className="mb-4">
                                                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Q{i + 1}</p>
                                                <p className="font-serif text-lg text-foreground/90">{l.q}</p>
                                            </div>
                                            <div className="mb-6">
                                                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">You</p>
                                                <p className="text-foreground/70 font-light">{l.a}</p>
                                            </div>
                                            <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                                                <p className="text-xs font-bold text-primary uppercase mb-2">Analysis</p>
                                                <p className="text-sm text-foreground/80 leading-relaxed">{l.feedback}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
