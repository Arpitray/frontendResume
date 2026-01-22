"use client";

import { useState } from "react";
import { uploadResume } from "@/src/lib/api";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/src/store/appStore";

export default function UploadBox() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setResumeId = useAppStore(s => s.setResumeId);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        setLoading(true);
        try {
            const result = await uploadResume(e.target.files[0]);
            setResumeId(result.stored_as!);
            router.push(`/chat?resume_id=${result.stored_as}`);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }

    return (
        <div className="w-full">
            <label
                className={`
          relative flex flex-col items-center justify-center w-full h-80
          rounded-3xl cursor-pointer 
          transition-all duration-300 ease-out group
          bg-white/50 dark:bg-white/5
          ${loading
                        ? "opacity-80 cursor-not-allowed"
                        : "hover:bg-white/80 dark:hover:bg-white/10"
                    }
        `}
            >
                {/* Dashed Border Overlay */}
                <div className={`absolute inset-0 m-4 rounded-[1.5rem] border-2 border-dashed transition-colors duration-300 ${loading ? 'border-slate-300 dark:border-slate-600' : 'border-slate-300 dark:border-slate-500 group-hover:border-slate-400 dark:group-hover:border-indigo-400 group-hover:bg-slate-50/50 dark:group-hover:bg-indigo-500/5'}`}></div>

                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-6 relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative w-20 h-20">
                                <svg className="animate-spin w-full h-full text-slate-200 dark:text-slate-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                    <span className="text-2xl">⚡</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Analyzing Resume...</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">This usually takes a few seconds</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="mb-2 text-2xl text-slate-400 dark:text-slate-800 font-bold tracking-tight">
                                Upload your Resume
                            </h3>
                            <p className="text-base text-slate-800 dark:text-slate-400 max-w-xs leading-relaxed mb-6">
                                Drag and drop your PDF here, or click to browse.
                            </p>
                            <div className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white text-base font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-500/30 group-hover:bg-indigo-700 dark:group-hover:bg-indigo-400 group-hover:-translate-y-0.5 transition-all">
                                Select PDF
                            </div>
                            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">
                                FAST & PRIVATE
                            </p>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleUpload}
                    disabled={loading}
                />
            </label>
            {loading && (
                <p className="text-center mt-4 text-sm text-muted-foreground animate-pulse">Analyzing document structure...</p>
            )}
        </div>
    );
}
