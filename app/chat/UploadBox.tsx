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
          relative flex flex-col items-center justify-center w-full min-h-[300px]
          rounded-sm cursor-pointer 
          transition-all duration-500 ease-out group
          bg-background hover:bg-secondary/10
          border border-dashed border-border/40 hover:border-primary/40
          ${loading ? "opacity-90 cursor-wait" : ""}
        `}
            >
               
                <div className="flex flex-col items-center justify-center pt-8 pb-8 text-center px-10 relative z-10 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center gap-6 animate-fade-in">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 border-[1px] border-primary/20 rounded-full"></div>
                                <div className="absolute inset-0 border-[1px] border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold uppercase tracking-widest text-foreground">Analyzing Document</p>
                                <p className="text-xs font-mono text-muted-foreground">Please wait...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 border border-foreground/10 text-foreground flex items-center justify-center mb-2 group-hover:bg-foreground group-hover:text-background transition-colors duration-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
                                    Upload Resume
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                                    PDF Format Only
                                </p>
                            </div>
                            
                            <div className="px-8 py-3 border border-foreground/20 text-foreground text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-all duration-300">
                                Select File
                            </div>
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
        </div>
    );
}
