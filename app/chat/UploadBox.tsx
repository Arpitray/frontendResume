"use client";

import { useState, useRef, useEffect } from "react";
import { uploadResume } from "@/src/lib/api";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/src/store/appStore";

export default function UploadBox() {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const setResumeId = useAppStore(s => s.setResumeId);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        setLoading(true);
        setShowModal(false);
        try {
            const result = await uploadResume(e.target.files[0]);
            setResumeId(result.stored_as!);
            router.push(`/chat?resume_id=${result.stored_as}`);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }

    const inputId = "resume-file-upload";

    function handleLabelClick(e: React.MouseEvent) {
        // Check if it's a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

        if (loading) {
            e.preventDefault();
            return;
        }

        if (isMobile) {
            e.preventDefault();
            setShowModal(true);
        } else {
             // For desktop, we manually trigger since we removed htmlFor to separate control
             fileInputRef.current?.click();
        }
    }

    return (
        <div className="w-full">
            <label
                onClick={handleLabelClick}
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
            </label>
            <input
                id={inputId}
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleUpload}
                disabled={loading}
            />

            {/* Mobile Modal Overlay */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={() => setShowModal(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

                    {/* Bottom Sheet */}
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-2xl animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxHeight: '50vh' }}
                    >
                        {/* Handle Bar */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-foreground">
                                    Upload Resume
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Select a PDF file from your device
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 px-6 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Choose PDF File
                                </button>

                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-full py-4 px-6 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                                <svg className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <p className="text-xs text-muted-foreground">
                                    Only PDF format is supported. File will be analyzed after upload.
                                </p>
                            </div>
                        </div>

                        {/* Safe area padding for iOS */}
                        <div className="h-safe-area-inset-bottom" />
                    </div>
                </div>
            )}
        </div>
    );
}
