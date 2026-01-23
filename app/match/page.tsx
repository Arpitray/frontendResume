"use client";

import { useState } from "react";
import { matchResumeFast, getAiCoach, getRoadmap, uploadJob, uploadResume } from "@/src/lib/api";
import { useAppStore } from "@/src/store/appStore";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

// Helper to clean bad control characters from JSON strings
function cleanJsonString(str: string): string {
    let result = '';
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (escape) {
                result += char;
                escape = false;
            } else {
                if (char === '\\') {
                    result += char;
                    escape = true;
                } else if (char === '"') {
                    result += char;
                    inString = false;
                } else if (char === '\n') {
                    result += '\\n';
                } else if (char === '\r') {
                    result += '\\r';
                } else if (char === '\t') {
                    result += '\\t';
                } else {
                    result += char;
                }
            }
        } else {
            if (char === '"') {
                inString = true;
            }
            result += char;
        }
    }
    return result;
}

// Robust JSON extraction helper
function extractJson(input: string): any {
    if (!input) return null;
    const str = input.trim();

    // 1. Try parsing directly (with and without cleaning)
    try {
        return JSON.parse(str);
    } catch {
        try {
            return JSON.parse(cleanJsonString(str));
        } catch { }
    }

    // 2. Try extracting from markdown code blocks
    const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlock) {
        try {
            return JSON.parse(codeBlock[1]);
        } catch {
            try {
                return JSON.parse(cleanJsonString(codeBlock[1]));
            } catch { }
        }
    }

    // 3. Fallback: Find first '{' or '[' and try to balance braces
    const firstOpenBrace = str.indexOf('{');
    const firstOpenBracket = str.indexOf('[');

    let startIndex = -1;
    let openChar = '';
    let closeChar = '';

    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIndex = firstOpenBrace;
        openChar = '{';
        closeChar = '}';
    } else if (firstOpenBracket !== -1) {
        startIndex = firstOpenBracket;
        openChar = '[';
        closeChar = ']';
    }

    if (startIndex !== -1) {
        let balance = 0;
        let inString = false;
        let escape = false;

        for (let i = startIndex; i < str.length; i++) {
            const char = str[i];

            if (escape) {
                escape = false;
                continue;
            }
            if (char === '\\') {
                escape = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === openChar) {
                    balance++;
                } else if (char === closeChar) {
                    balance--;
                    if (balance === 0) {
                        try {
                            const jsonCandidate = str.substring(startIndex, i + 1);
                            return JSON.parse(jsonCandidate);
                        } catch {
                            try {
                                const jsonCandidate = str.substring(startIndex, i + 1);
                                return JSON.parse(cleanJsonString(jsonCandidate));
                            } catch { }
                        }
                        break;
                    }
                }
            }
        }
    }

    // 4. Last resort: Greedy match
    if (startIndex !== -1) {
        const lastIndex = str.lastIndexOf(closeChar);
        if (lastIndex > startIndex) {
            try {
                return JSON.parse(str.substring(startIndex, lastIndex + 1));
            } catch {
                try {
                    return JSON.parse(cleanJsonString(str.substring(startIndex, lastIndex + 1)));
                } catch { }
            }
        }
    }

    throw new Error("Failed to extract JSON from content");
}

export default function MatchPage() {
    const resumeId = useAppStore(s => s.resumeId);
    const setResumeId = useAppStore(s => s.setResumeId);
    const setJobId = useAppStore(s => s.setJobId);
    const router = useRouter();

    const [jobDescription, setJobDescription] = useState("");
    const [uploadingJob, setUploadingJob] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [data, setData] = useState<any>(null); // Stores fast match result
    const [coachData, setCoachData] = useState<any>(null);
    const [roadmapData, setRoadmapData] = useState<any>(null);

    // Loading states
    const [loading, setLoading] = useState(false); // fast match loading
    const [loadingCoach, setLoadingCoach] = useState(false);
    const [loadingRoadmap, setLoadingRoadmap] = useState(false);

    const [activeTab, setActiveTab] = useState<'analysis' | 'coach' | 'roadmap'>('analysis');

    async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        setUploadingResume(true);
        try {
            const result = await uploadResume(e.target.files[0]);
            setResumeId(result.stored_as!);
        } catch (err) {
            console.error(err);
            alert("Failed to upload resume");
        } finally {
            setUploadingResume(false);
        }
    }

    async function handleJobUpload() {
        if (!jobDescription.trim()) {
            alert("Please enter a job description");
            return;
        }

        setUploadingJob(true);
        try {
            const result = await uploadJob(jobDescription);
            setCurrentJobId(result.job_id);
            setJobId(result.job_id);
        } catch (err) {
            console.error(err);
            alert("Failed to upload job description");
        } finally {
            setUploadingJob(false);
        }
    }

    async function runMatch() {
        if (!resumeId) {
            alert("Please upload a resume first");
            router.push("/");
            return;
        }

        if (!currentJobId) {
            alert("Please upload job description first");
            return;
        }

        setLoading(true);
        // Reset previous results
        setData(null);
        setCoachData(null);
        setRoadmapData(null);
        setActiveTab('analysis');

        try {
            // 1. Critical Path: Fast Match associated with visualization
            const result = await matchResumeFast(resumeId, currentJobId);
            setData(result);
            setLoading(false); // Immediate UI update

            // 2. Background Path: Fire & Forget requests for expensive AI tasks
            prefetchAiInsights(resumeId, currentJobId);

        } catch (err) {
            console.error(err);
            alert("Match failed. Please try again.");
            setLoading(false);
        }
    }

    // Prefetch AI data in background
    function prefetchAiInsights(rId: string, jId: string) {
        // Coach
        if (!coachData && !loadingCoach) {
            setLoadingCoach(true);
            getAiCoach(rId, jId)
                .then(res => setCoachData(res))
                .catch(err => console.error("Background Coach Fetch Error:", err))
                .finally(() => setLoadingCoach(false));
        }

        // Roadmap
        if (!roadmapData && !loadingRoadmap) {
            setLoadingRoadmap(true);
            getRoadmap(rId, jId)
                .then(res => setRoadmapData(res))
                .catch(err => console.error("Background Roadmap Fetch Error:", err))
                .finally(() => setLoadingRoadmap(false));
        }
    }

    // Tab switcher just changes view, data is either already there or loading
    const switchTab = (tab: 'analysis' | 'coach' | 'roadmap') => {
        setActiveTab(tab);
        // If for some reason data failed or wasn't fetched, retry on click
        if (tab === 'coach' && !coachData && !loadingCoach) {
            prefetchAiInsights(resumeId!, currentJobId!);
        }
        if (tab === 'roadmap' && !roadmapData && !loadingRoadmap) {
            prefetchAiInsights(resumeId!, currentJobId!);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pt-32 pb-20">
            <Navbar />
            <div className="max-w-5xl mx-auto px-6">
                
                {/* Header Section - Editorial */}
                <div className="flex flex-col items-center text-center mb-20 space-y-8 animate-fade-in relative z-10">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-primary/80 border-b border-primary/20 pb-1">
                        Intelligence Module 01
                    </span>
                    <h1 className="text-display font-medium text-foreground tracking-tight max-w-3xl leading-[1.1]">
                        The Alignment Report
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
                        Precision matching between your professional narrative and market requirements.
                    </p>
                </div>

                {/* Input Section - Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    
                    {/* Resume Card */}
                    <div className={`p-8 bg-background border border-border/40 transition-all duration-500 relative group overflow-hidden ${resumeId ? 'border-primary/50' : 'hover:border-primary/30'}`}>
                        <div className={`absolute top-0 left-0 w-[2px] h-0 bg-primary transition-all duration-500 ${resumeId ? 'h-full' : 'group-hover:h-full'}`}></div>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm tracking-[0.2em] uppercase font-bold text-foreground/80 flex items-center gap-3">
                                <span className={`flex h-2 w-2 rounded-full ${resumeId ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                Resume
                            </h3>
                             {resumeId && (
                                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">UPLOADED</span>
                             )}
                        </div>

                        {resumeId ? (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <p className="text-sm text-foreground font-medium mb-1">Resume Analysis Ready</p>
                                <p className="text-xs text-muted-foreground mb-6 font-mono">ID: {resumeId.slice(0, 8)}...</p>
                                <button
                                    onClick={() => setResumeId(null!)}
                                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                                >
                                    Replace File
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border border-dashed border-border rounded-2xl cursor-pointer hover:bg-secondary/50 transition-colors group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                    {uploadingResume ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            <p className="text-xs font-medium text-muted-foreground">Uploading...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 mb-3 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium text-foreground mb-1">Upload PDF</p>
                                            <p className="text-xs text-muted-foreground">Drag & drop or click</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={handleResumeUpload}
                                    disabled={uploadingResume}
                                />
                            </label>
                        )}
                    </div>

                    {/* Job Card */}
                    <div className={`p-8 bg-background border border-border/40 transition-all duration-500 relative group overflow-hidden ${currentJobId ? 'border-primary/50' : 'hover:border-primary/30'}`}>
                        <div className={`absolute top-0 right-0 w-[2px] h-0 bg-primary transition-all duration-500 ${currentJobId ? 'h-full' : 'group-hover:h-full'}`}></div>
                         <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm tracking-[0.2em] uppercase font-bold text-foreground/80 flex items-center gap-3">
                                <span className={`flex h-2 w-2 rounded-full ${currentJobId ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                Job Description
                            </h3>
                            {currentJobId && (
                                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">Active</span>
                             )}
                        </div>

                        {!currentJobId ? (
                            <div className="space-y-4">
                                <textarea
                                    className="w-full h-32 p-4 bg-secondary/30 border border-border rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm placeholder:text-muted-foreground/50 transition-all font-light"
                                    placeholder="Paste job details here (requirements, role overview)..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    disabled={uploadingJob}
                                />
                                <button
                                    onClick={handleJobUpload}
                                    disabled={uploadingJob || !jobDescription.trim()}
                                    className="w-full py-3 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {uploadingJob ? "Processing..." : "Set Context"}
                                </button>
                            </div>
                        ) : (
                             <div className="text-center py-8">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                </div>
                                <p className="text-sm text-foreground font-medium mb-1">Context Set</p>
                                <p className="text-xs text-muted-foreground mb-6">ready for analysis</p>
                                <button
                                    onClick={() => {
                                        setCurrentJobId(null);
                                        setJobDescription("");
                                        setData(null);
                                        setCoachData(null);
                                        setRoadmapData(null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                                >
                                    Change Job
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Primary Action */}
                {resumeId && currentJobId && !data && (
                    <div className="text-center mb-16 animate-fade-in">
                        <button
                            onClick={runMatch}
                            disabled={loading}
                            className="group relative px-10 py-5 bg-foreground text-background rounded-full font-medium text-lg overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             <span className="relative z-10 flex items-center gap-2">
                                {loading ? "Analyzing..." : "Begin Analysis"}
                                {!loading && <span className="group-hover:translate-x-1 transition-transform">→</span>}
                             </span>
                             <div className="absolute inset-0 bg-primary/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase">Computing Match</p>
                    </div>
                )}

                {data && (
                    <div className="animate-fade-in space-y-12">
                        
                        {/* Tab Navigation - Minimal */}
                        <div className="flex justify-center mb-8">
                            <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-full border border-border">
                                {['analysis', 'coach', 'roadmap'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => switchTab(t as any)}
                                        className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === t
                                                ? 'bg-foreground text-background shadow-md'
                                                : 'text-muted-foreground hover:text-foreground'
                                            } capitalize`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeTab === 'analysis' && (
                            <>
                                {/* Match Score Section - High Fashion Editorial Style */}
                                <div className="p-8 md:p-12 editorial-glass rounded-none md:rounded-3xl border border-border/10 relative overflow-hidden transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12 relative z-10">
                                        <div className="text-left space-y-2">
                                            <div className="flex items-center gap-3">
                                               <div className="h-[1px] w-12 bg-primary"></div>
                                               <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary">Compatibility Index</p>
                                            </div>
                                            <h2 className="text-[8rem] md:text-[10rem] leading-[0.8] font-medium text-foreground tracking-tighter -ml-1">
                                                {Math.round(data.match_score_percent)}
                                            </h2>
                                            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-md pt-4 border-t border-border/30 mt-4 leading-relaxed">
                                                {data.match_score_percent >= 80 ? "An exceptional alignment." :
                                                    data.match_score_percent >= 60 ? "Strong profile with potential." :
                                                        data.match_score_percent >= 40 ? "Foundational match." : "Misalignment detected."}
                                            </p>
                                        </div>

                                        <div className="flex-1 w-full max-w-md bg-white/50 dark:bg-black/20 p-8 rounded-xl backdrop-blur-sm border border-border/5">
                                            <div className="space-y-8">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs tracking-widest uppercase">
                                                        <span className="text-muted-foreground">Relevance</span>
                                                        <span className="font-bold">{data.resume_chunks} pts</span>
                                                    </div>
                                                     <div className="w-full bg-foreground/5 h-[2px]">
                                                        <div className="bg-foreground h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(data.resume_chunks * 10, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs tracking-widest uppercase">
                                                        <span className="text-muted-foreground">Requirements</span>
                                                        <span className="font-bold">{data.top_matches.length} matches</span>
                                                    </div>
                                                    <div className="w-full bg-foreground/5 h-[2px]">
                                                        <div className="bg-primary h-full transition-all duration-1000 ease-out" style={{ width: `${(data.top_matches.length / Math.max(data.job_chunks, 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/30 rounded-full blur-[80px] -z-10"></div>
                                </div>

                                {/* Detailed Matches - List View */}
                                <div className="space-y-6 mt-12">
                                    <h3 className="text-xl font-medium text-foreground">Alignment Breakdown</h3>
                                    
                                    <div className="divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden">
                                        {data.top_matches.map((m: any, i: number) => (
                                            <div key={i} className="p-8 hover:bg-secondary/30 transition-colors group">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                       <span className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-xs font-mono text-muted-foreground">
                                                            {i + 1}
                                                       </span>
                                                       <span className="text-xs font-mono text-primary uppercase tracking-wider">
                                                           {(m.score * 100).toFixed(0)}% Relevance
                                                       </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Experience</p>
                                                        <p className="text-sm text-foreground/80 leading-relaxed font-light">{m.resume_chunk}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Requirement</p>
                                                        <p className="text-sm text-foreground/80 leading-relaxed font-light">{m.job_match}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'coach' && (
                            loadingCoach ? (
                                <div className="text-center py-24">
                                    <div className="inline-block animate-pulse text-primary mb-4 text-2xl">✦</div>
                                    <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Consulting Expert AI...</p>
                                </div>
                            ) : coachData && coachData.ai_feedback ? (() => {
                                let feedback;
                                try {
                                    if (typeof coachData.ai_feedback === 'string') {
                                        feedback = extractJson(coachData.ai_feedback);
                                    } else {
                                        feedback = coachData.ai_feedback;
                                    }
                                } catch (e) {
                                    return <div className="p-8 text-center text-muted-foreground">Unable to render detailed feedback.</div>;
                                }

                                return (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="p-8 bg-card border border-border rounded-3xl relative">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-foreground">Strategic Feedback</h3>
                                            </div>

                                            {/* Missing Skills */}
                                            {feedback.missing_skills && feedback.missing_skills.length > 0 && (
                                                <div className="mb-10">
                                                    <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 pl-1 border-l-2 border-primary">Critical Gaps</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {feedback.missing_skills.map((skill: string, idx: number) => (
                                                            <span key={idx} className="px-3 py-1 bg-secondary text-foreground text-sm rounded-full border border-border/50">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Improvements Grid */}
                                            {feedback.suggestions && feedback.suggestions.length > 0 && (
                                                <div className="grid grid-cols-1 gap-6">
                                                     <h4 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-2 pl-1 border-l-2 border-primary">Refinements</h4>
                                                    {feedback.suggestions.map((suggestion: any, idx: number) => (
                                                        <div key={idx} className="p-6 bg-secondary/20 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                                                <div className="space-y-1">
                                                                     <span className="text-xs font-semibold text-red-500/80 uppercase tracking-wide">Current</span>
                                                                     <p className="text-sm text-foreground/70 font-light italic">"{suggestion.before}"</p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                     <span className="text-xs font-semibold text-primary uppercase tracking-wide">Optimization</span>
                                                                     <p className="text-sm text-foreground font-medium">"{suggestion.after}"</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 pt-4 border-t border-border/50">
                                                                <p className="text-xs text-muted-foreground">Recall: {suggestion.reason}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : null
                        )}

                         {activeTab === 'roadmap' && (
                            loadingRoadmap ? (
                                <div className="text-center py-24">
                                    <div className="inline-block animate-bounce text-primary mb-4 text-2xl">↓</div>
                                    <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Architecting Path...</p>
                                </div>
                            ) : roadmapData ? (() => {
                                let learningPath;
                                const rawData = roadmapData.learning_path || roadmapData;
                                try {
                                    if (typeof rawData === 'string') {
                                        learningPath = extractJson(rawData);
                                    } else {
                                        learningPath = rawData;
                                    }
                                } catch (e) {
                                    return <div className="text-center py-12 text-muted-foreground">Roadmap Unavailable.</div>;
                                }

                                const roadmapItems = learningPath.roadmap || learningPath.phases || (Array.isArray(learningPath) ? learningPath : null);
                                
                                if (!roadmapItems || roadmapItems.length === 0) return <div className="text-center py-12 text-muted-foreground">No data.</div>;

                                return (
                                    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in relative">
                                        <div className="absolute left-8 top-8 bottom-8 w-px bg-border"></div>
                                        
                                        {roadmapItems.map((item: any, idx: number) => {
                                             const dayLabel = item.day ? `Day ${item.day}` : item.phase_name || `Step ${idx + 1}`;
                                              return (
                                                <div key={idx} className="relative pl-20">
                                                    <div className="absolute left-6 top-0 w-4 h-4 -ml-2 rounded-full border-2 border-primary bg-background z-10"></div>
                                                    
                                                    <div className="mb-6">
                                                        <span className="text-xs font-mono text-primary uppercase tracking-wider mb-1 block">{dayLabel}</span>
                                                        <h3 className="text-xl font-medium text-foreground mb-2">{item.goal || item.description}</h3>
                                                        {item.duration && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{item.duration}</span>}
                                                    </div>

                                                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                                        {(item.what_to_learn || item.skills) && (
                                                             <div className="mb-4">
                                                                <ul className="space-y-1">
                                                                     {(item.what_to_learn || item.skills).map((k: string, i: number) => (
                                                                         <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                                                                            <span className="text-primary mt-1.5 text-[0.6rem]">●</span> {k}
                                                                         </li>
                                                                     ))}
                                                                </ul>
                                                             </div>
                                                        )}
                                                        
                                                        {(item.mini_task || item.task) && (
                                                            <div className="mt-4 pt-4 border-t border-border/50">
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Action Item</p>
                                                                <p className="text-sm font-medium text-foreground">{item.mini_task || item.task}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                              )
                                        })}
                                    </div>
                                )
                            })() : (
                                <div className="text-center py-20 bg-secondary/20 rounded-3xl">
                                    <div className="mb-4">
                                        <span className="text-2xl text-muted-foreground block mb-2">⚠</span>
                                        <h3 className="text-lg font-medium">Generation Interrupted</h3>
                                    </div>
                                    <button
                                        onClick={() => getRoadmap(resumeId!, currentJobId!).then(data => setRoadmapData(data)).catch(err => console.error(err))}
                                        className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-4"
                                    >
                                        Retake Roadmap
                                    </button>
                                </div>
                            )
                        )}


                        <div className="flex justify-center pt-16">
                             <button
                                onClick={() => router.push("/chat?resume_id=" + resumeId)}
                                className="px-8 py-3 bg-secondary text-foreground hover:bg-muted transition-colors rounded-full font-medium"
                             >
                                Start Chat Session →
                             </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
