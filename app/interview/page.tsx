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
                alert("Speech recognition error: " + e.error);
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

            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[80px] opacity-70 dark:opacity-30 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-200/40 dark:bg-pink-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[80px] opacity-70 dark:opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-200/40 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-[80px] opacity-70 dark:opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <main className="flex-1 pt-32 pb-12 px-6 max-w-4xl mx-auto w-full relative z-10">

                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/80 border border-border shadow-sm backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <span className="text-sm font-medium text-muted-foreground">Voice Interview Simulator</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        Practice Makes <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Perfect</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Simulate real interview scenarios with AI-driven voice questions and instant feedback.
                    </p>
                </div>

                {/* UPLOAD RESUME */}
                {!resumeId && (
                    <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[2rem] p-8 md:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Upload Resume</h2>
                        <p className="text-muted-foreground mb-8">Upload your PDF resume to start the personalized interview session.</p>

                        <label className="relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-white transition duration-300 ease-out border-2 border-primary rounded-full shadow-md group cursor-pointer bg-primary">
                            <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-primary group-hover:translate-x-0 ease">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                            </span>
                            <span className="absolute flex items-center justify-center w-full h-full text-white transition-all duration-300 transform group-hover:translate-x-full ease">Upload PDF</span>
                            <span className="relative invisible">Upload PDF</span>
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
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="font-medium">Analyzing resume...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* JOB DESCRIPTION */}
                {resumeId && !jobId && (
                    <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[2rem] p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Target Role</h2>
                                <p className="text-muted-foreground">Paste the job description you're applying for</p>
                            </div>
                        </div>

                        <textarea
                            className="w-full p-4 bg-secondary/50 border border-border rounded-xl text-foreground mb-6 h-48 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none font-mono text-sm"
                            placeholder="Paste job requirements here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={handleJobUpload}
                                disabled={uploadingJob || !jobDescription.trim()}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {uploadingJob ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>Continue <span aria-hidden="true">&rarr;</span></>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* START BUTTON */}
                {resumeId && jobId && !sessionId && (
                    <div className="text-center animate-in zoom-in duration-300">
                        <button
                            onClick={startInterview}
                            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gray-900 font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 shadow-2xl hover:scale-105"
                        >
                            <span className="w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700"></span>
                            <span className="relative flex items-center gap-3">
                                <span className="text-2xl">🎙️</span>
                                Start AI Interview Session
                            </span>
                        </button>
                    </div>
                )}

                {/* INTERVIEW SESSION */}
                {sessionId && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* Status Bar */}
                        <div className="flex flex-col md:flex-row items-center justify-between bg-card/50 backdrop-blur border border-border rounded-2xl p-4 shadow-sm gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                <span className="font-medium text-sm text-foreground/80">Live Session</span>
                            </div>

                            <div className="flex items-center gap-6">
                                {latestFeedback && (
                                    <div className="hidden md:flex items-center gap-4 text-sm border-r border-border pr-6 mr-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Correctness</span>
                                            <span className={`font-bold ${latestFeedback.correctness >= 7 ? 'text-green-500' : latestFeedback.correctness >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                                                {latestFeedback.correctness}/10
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Clarity</span>
                                            <span className={`font-bold ${latestFeedback.clarity >= 7 ? 'text-green-500' : latestFeedback.clarity >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                                                {latestFeedback.clarity}/10
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Depth</span>
                                            <span className={`font-bold ${latestFeedback.depth >= 7 ? 'text-green-500' : latestFeedback.depth >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                                                {latestFeedback.depth}/10
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Score</span>
                                    <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                        {isNaN(score) ? 0 : score}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Question */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider mb-4">AI Question</span>
                            <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                                {question}
                            </p>
                        </div>

                        {/* User Answer */}
                        <div className="bg-card border border-border rounded-3xl p-1 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <div className="bg-secondary/30 rounded-[1.4rem] p-6">
                                <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Answer</span>
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder="Click 'Start Mic' to speak, or type your answer here..."
                                    className="w-full bg-transparent border-none p-0 text-lg text-foreground placeholder:text-muted-foreground/50 focus:ring-0 resize-none min-h-[120px] leading-relaxed"
                                />
                            </div>

                            <div className="flex gap-3 p-3">
                                <button
                                    onClick={toggleMic}
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${listening
                                        ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 animate-pulse"
                                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/50"
                                        }`}
                                >
                                    {listening ? (
                                        <>
                                            <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
                                            Stop Recording
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                                            Start Mic
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={submitAnswer}
                                    disabled={!transcript.trim()}
                                    className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    Submit Answer
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                        </div>

                        {/* History */}
                        {log.length > 0 && (
                            <div className="mt-12">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="text-2xl">📜</span> Session History
                                </h3>
                                <div className="space-y-4">
                                    {log.map((l, i) => (
                                        <div key={i} className="bg-card/50 border border-border rounded-2xl p-6 hover:bg-card transition-colors">
                                            <div className="mb-4 pb-4 border-b border-border/50">
                                                <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Q{i + 1}</p>
                                                <p className="font-medium text-lg">{l.q}</p>
                                            </div>
                                            <div className="mb-4">
                                                <p className="text-sm font-bold text-muted-foreground uppercase mb-1">You</p>
                                                <p className="text-foreground/80">{l.a}</p>
                                            </div>
                                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                                                <p className="text-sm font-bold text-green-700 dark:text-green-400 uppercase mb-1">Feedback</p>
                                                <p className="text-green-800 dark:text-green-300 text-sm leading-relaxed">{l.feedback}</p>
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
