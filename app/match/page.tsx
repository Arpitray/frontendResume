"use client";

import { useState } from "react";
import { matchResumeFast, getAiCoach, getRoadmap, uploadJob, uploadResume } from "@/src/lib/api";
import { useAppStore } from "@/src/store/appStore";
import { useRouter } from "next/navigation";

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
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-6xl mx-auto px-8 py-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-3 text-center">
                    AI Resume ↔ Job Match
                </h1>
                <p className="text-muted-foreground text-center mb-12 text-lg">
                    Analyze how well your resume matches a job description
                </p>

                {/* Resume Upload */}
                <div className="mb-8 p-6 bg-card border border-border rounded-2xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${resumeId ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        Resume Upload
                    </h3>
                    {resumeId ? (
                        <div>
                            <p className="text-muted-foreground mb-2">Resume uploaded ✓ (ID: {resumeId.slice(0, 8)}...)</p>
                            <button
                                onClick={() => setResumeId(null!)}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted transition-all"
                            >
                                Upload Different Resume
                            </button>
                        </div>
                    ) : (
                        <div>
                            <label className="relative flex flex-col items-center justify-center w-full h-48 rounded-2xl cursor-pointer transition-all duration-300 ease-out group bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border-2 border-dashed border-slate-300 dark:border-slate-500 hover:border-indigo-400 dark:hover:border-indigo-400">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-6">
                                    {uploadingResume ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <p className="text-sm font-semibold text-foreground">Processing...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="w-12 h-12 mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                            </svg>
                                            <h4 className="mb-2 text-lg font-bold text-foreground">Upload your Resume</h4>
                                            <p className="text-sm text-muted-foreground">Click to browse or drag and drop PDF</p>
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
                        </div>
                    )}
                </div>

                {/* Job Description Upload */}
                <div className="mb-8 p-6 bg-card border border-border rounded-2xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${currentJobId ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        Job Description
                    </h3>

                    {!currentJobId ? (
                        <>
                            <textarea
                                className="w-full h-48 p-4 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground/70"
                                placeholder="Paste the job description here...&#10;&#10;Include requirements, responsibilities, qualifications, and any other relevant details."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                disabled={uploadingJob}
                            />
                            <button
                                onClick={handleJobUpload}
                                disabled={uploadingJob || !jobDescription.trim()}
                                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/25"
                            >
                                {uploadingJob ? "Processing..." : "Upload Job Description"}
                            </button>
                        </>
                    ) : (
                        <div>
                            <p className="text-muted-foreground mb-2">Job description uploaded ✓</p>
                            <button
                                onClick={() => {
                                    setCurrentJobId(null);
                                    setJobDescription("");
                                    setData(null);
                                    setCoachData(null);
                                    setRoadmapData(null);
                                }}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted transition-all"
                            >
                                Upload Different Job
                            </button>
                        </div>
                    )}
                </div>

                {/* Run Match Button */}
                {resumeId && currentJobId && !data && (
                    <div className="text-center mb-8">
                        <button
                            onClick={runMatch}
                            disabled={loading}
                            className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                        >
                            {loading ? "Analyzing Match..." : "Run AI Match Analysis"}
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-muted-foreground">AI analyzing match...</p>
                    </div>
                )}

                {data && (
                    <div className="space-y-8">
                        {/* Tabs */}
                        <div className="flex justify-center mb-8">
                            <div className="bg-muted p-1 rounded-xl inline-flex">
                                <button
                                    onClick={() => switchTab('analysis')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'analysis'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Analysis
                                </button>
                                <button
                                    onClick={() => switchTab('coach')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'coach'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    AI Coach
                                </button>
                                <button
                                    onClick={() => switchTab('roadmap')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'roadmap'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    Roadmap
                                </button>
                            </div>
                        </div>

                        {activeTab === 'analysis' && (
                            <>
                                {/* Match Score Card */}
                                <div className="relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10"></div>
                                    <div className="relative p-12 bg-card/50 backdrop-blur-sm border border-border rounded-3xl">
                                        <div className="max-w-4xl mx-auto">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                                {/* Score Display */}
                                                <div className="flex-1 text-center md:text-left">
                                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Match Analysis</p>
                                                    <div className="flex items-baseline gap-3">
                                                        <h2 className="text-7xl md:text-8xl font-bold tracking-tight">
                                                            <span className="bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                                                                {Math.round(data.match_score_percent)}
                                                            </span>
                                                        </h2>
                                                        <span className="text-4xl font-semibold text-muted-foreground">%</span>
                                                    </div>
                                                    <p className="text-lg font-medium text-muted-foreground mt-3">
                                                        {data.match_score_percent >= 80 ? "Excellent fit for this role" :
                                                            data.match_score_percent >= 60 ? "Strong candidate profile" :
                                                                data.match_score_percent >= 40 ? "Potential with development" : "Consider skill gaps"}
                                                    </p>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="flex-1 w-full md:w-auto">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-sm font-medium">
                                                            <span className="text-muted-foreground">Overall Compatibility</span>
                                                            <span className="text-foreground">{Math.round(data.match_score_percent)}%</span>
                                                        </div>
                                                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                                                                style={{ width: `${data.match_score_percent}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>Resume Analysis</span>
                                                            <span>{data.resume_chunks} sections</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analysis Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-card border border-border rounded-2xl hover:border-indigo-500/50 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Resume</h3>
                                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-foreground">{data.resume_chunks}</p>
                                        <p className="text-sm text-muted-foreground mt-1">Sections analyzed</p>
                                    </div>
                                    <div className="p-6 bg-card border border-border rounded-2xl hover:border-purple-500/50 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Job Role</h3>
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                                                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-foreground">{data.job_chunks}</p>
                                        <p className="text-sm text-muted-foreground mt-1">Requirements checked</p>
                                    </div>
                                    <div className="p-6 bg-card border border-border rounded-2xl hover:border-pink-500/50 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Matches</h3>
                                            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-all">
                                                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-foreground">{data.top_matches.length}</p>
                                        <p className="text-sm text-muted-foreground mt-1">Top alignments found</p>
                                    </div>
                                </div>

                                {/* Top Matches */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-foreground">Skill Alignments</h2>
                                        <span className="text-sm text-muted-foreground">Ranked by relevance</span>
                                    </div>

                                    <div className="space-y-4">
                                        {data.top_matches.map((m: any, i: number) => (
                                            <div key={i} className="group relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="relative p-6 bg-card border border-border rounded-2xl hover:border-border/80 transition-all">
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-muted-foreground">Alignment Score</p>
                                                                <p className="text-2xl font-bold text-foreground">{(m.score * 100).toFixed(0)}%</p>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-1 bg-secondary rounded-full">
                                                            <span className="text-xs font-medium text-foreground">Match #{i + 1}</span>
                                                        </div>
                                                    </div>

                                                    {/* Content Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Experience</p>
                                                            </div>
                                                            <p className="text-sm text-foreground leading-relaxed">
                                                                {m.resume_chunk}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Requirement</p>
                                                            </div>
                                                            <p className="text-sm text-foreground leading-relaxed">
                                                                {m.job_match}
                                                            </p>
                                                        </div>
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
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-6"></div>
                                    <h3 className="text-xl font-semibold text-foreground">Consulting AI Coach...</h3>
                                    <p className="text-muted-foreground mt-2">Analyzing your resume against industry standards</p>
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
                                    console.error("Failed to parse AI feedback JSON:", e);
                                    return (
                                        <div className="mt-12 p-8 bg-card border border-border rounded-2xl shadow-lg">
                                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-muted/30 p-4 rounded-lg">
                                                {typeof coachData.ai_feedback === 'string' ? coachData.ai_feedback.replace(/```json/g, '').replace(/```/g, '') : "Feedback available but could not be parsed."}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="mt-8 p-8 bg-card border border-border rounded-2xl shadow-lg">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                                <span className="text-white text-xl">✨</span>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-foreground">AI Resume Coach</h2>
                                                <p className="text-sm text-muted-foreground">Personalized recommendations for your career growth</p>
                                            </div>
                                        </div>

                                        {/* Missing Skills Section */}
                                        {feedback.missing_skills && feedback.missing_skills.length > 0 && (
                                            <div className="mb-8">
                                                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                                    <span className="text-amber-500">⚠️</span>
                                                    Skills to Highlight
                                                </h3>
                                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                                                    <ul className="space-y-2">
                                                        {feedback.missing_skills.map((skill: string, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-foreground/80">
                                                                <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                                                                <span>{skill}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggestions Section */}
                                        {feedback.suggestions && feedback.suggestions.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                                    <span className="text-green-500">💡</span>
                                                    Resume Improvement Suggestions
                                                </h3>
                                                <div className="space-y-6">
                                                    {feedback.suggestions.map((suggestion: any, idx: number) => (
                                                        <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900/50 rounded-xl p-5">
                                                            <div className="flex items-start gap-3 mb-3">
                                                                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="mb-4">
                                                                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wide">Before</p>
                                                                        <p className="text-sm text-foreground/70 leading-relaxed">{suggestion.before}</p>
                                                                    </div>
                                                                    <div className="mb-4">
                                                                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 uppercase tracking-wide">After</p>
                                                                        <p className="text-sm text-foreground font-medium leading-relaxed">{suggestion.after}</p>
                                                                    </div>
                                                                    <div className="pt-3 border-t border-green-200 dark:border-green-900/50">
                                                                        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Why This Matters</p>
                                                                        <p className="text-sm text-foreground/70 leading-relaxed">{suggestion.reason}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })() : null
                        )}

                        {/* Learning Path Section */}
                        {activeTab === 'roadmap' && (
                            loadingRoadmap ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                                    <h3 className="text-xl font-semibold text-foreground">Generating Roadmap...</h3>
                                    <p className="text-muted-foreground mt-2">Charting your personalized learning path</p>
                                </div>
                            ) : roadmapData ? (() => {
                                let learningPath;
                                // Handle both { learning_path: ... } wrapper and direct response
                                const rawData = roadmapData.learning_path || roadmapData;

                                try {
                                    if (typeof rawData === 'string') {
                                        learningPath = extractJson(rawData);
                                    } else {
                                        learningPath = rawData;
                                    }
                                } catch (e) {
                                    console.error("Failed to parse learning_path:", e);
                                    return <div className="text-center py-12 text-red-500">Failed to parse roadmap data.</div>;
                                }

                                // Get roadmap data - check for roadmap, phases, or treat as array
                                const roadmapItems = learningPath.roadmap || learningPath.phases || (Array.isArray(learningPath) ? learningPath : null);
                                const skillGaps = learningPath.skill_gaps || learningPath.missing_skills || [];

                                if (!roadmapItems || roadmapItems.length === 0) {
                                    return <div className="text-center py-12 text-muted-foreground">No roadmap items found.</div>;
                                }

                                return (
                                    <div className="mt-8 p-8 bg-card border border-border rounded-2xl shadow-lg">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                                <span className="text-white text-xl">🎯</span>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-foreground">AI Learning Roadmap</h2>
                                                <p className="text-sm text-muted-foreground">Your personalized path to career advancement</p>
                                            </div>
                                        </div>

                                        {/* Skill Gaps Section */}
                                        {skillGaps.length > 0 && (
                                            <div className="mb-8 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-5">
                                                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                                    <span className="text-orange-500">🎓</span>
                                                    Skills to Develop
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {skillGaps.map((skill: string, idx: number) => (
                                                        <span key={idx} className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm font-medium">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Roadmap Section */}
                                        <div className="space-y-6">
                                            {roadmapItems.map((item: any, idx: number) => {
                                                const dayLabel = item.day ? `Day ${item.day}` : item.phase_name || item.name || item.title || `Step ${idx + 1}`;
                                                const goal = item.goal || item.description;
                                                const learningItems = item.what_to_learn || item.skills || [];
                                                const task = item.mini_task || item.task;
                                                const duration = item.duration;
                                                const resources = item.resources || [];

                                                return (
                                                    <div key={idx} className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-6">
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                                {item.day || idx + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h3 className="text-lg font-bold text-foreground">{dayLabel}</h3>
                                                                    {duration && (
                                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                            <span>⏱️</span>
                                                                            {duration}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {goal && (
                                                                    <p className="text-sm text-foreground/90 font-medium mb-4">{goal}</p>
                                                                )}

                                                                {learningItems.length > 0 && (
                                                                    <div className="mb-4">
                                                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">What to Learn</p>
                                                                        <ul className="space-y-1.5">
                                                                            {learningItems.map((item: string, itemIdx: number) => (
                                                                                <li key={itemIdx} className="flex items-start gap-2 text-sm text-foreground/70">
                                                                                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                                                                                    <span>{item}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}

                                                                {task && (
                                                                    <div className="pt-3 border-t border-blue-200 dark:border-blue-900/50">
                                                                        <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1 uppercase tracking-wide">Mini Task</p>
                                                                        <p className="text-sm text-foreground/80 leading-relaxed">{task}</p>
                                                                    </div>
                                                                )}

                                                                {resources.length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900/50">
                                                                        <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2 uppercase tracking-wide">Recommended Resources</p>
                                                                        <ul className="space-y-1">
                                                                            {resources.map((resource: string, resIdx: number) => (
                                                                                <li key={resIdx} className="flex items-start gap-2 text-sm text-foreground/70">
                                                                                    <span className="text-cyan-600 dark:text-cyan-400 mt-0.5">•</span>
                                                                                    <span>{resource}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="text-center py-20">
                                    <div className="mb-4">
                                        <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                                            <span className="text-2xl">🗺️</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground">Roadmap Not Ready</h3>
                                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                        The learning roadmap generation might have been interrupted.
                                    </p>
                                    <button
                                        onClick={() => getRoadmap(resumeId!, currentJobId!).then(data => setRoadmapData(data)).catch(err => console.error(err))}
                                        className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all font-medium"
                                    >
                                        Try Generating Again
                                    </button>
                                </div>
                            )
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                            <button
                                onClick={() => {
                                    setData(null);
                                    setCurrentJobId(null);
                                    setJobDescription("");
                                }}
                                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-muted transition-all border border-border"
                            >
                                Analyze Different Role
                            </button>
                            <button
                                onClick={() => router.push("/chat?resume_id=" + resumeId)}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-xl"
                            >
                                Continue to AI Chat
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>

    );
}
