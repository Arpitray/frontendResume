const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

/* ---------------- TYPES ---------------- */

export interface UploadResponse {
  status: string;
  original_name?: string;
  stored_as?: string;
  chunks?: number;
}

export interface AskResponse {
  query: string;
  result: string;
  citations?: string[];
}

export interface JobUploadResponse {
  status: string;
  job_id: string;
  chunks: number;
}

export interface MatchResult {
  match_score_percent: number;
  resume_chunks: number;
  job_chunks: number;
  top_matches: {
    resume_chunk: string;
    job_match: string;
    score: number;
  }[];
}

/* ---------------- CORE FETCH WRAPPER ---------------- */

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `API Error ${res.status}: ${text || "Unknown error"}`
    );
  }

  return res.json();
}

/* ---------------- RESUME ---------------- */

export async function uploadResume(
  file: File
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload-resume`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  return res.json();
}

export async function askQuestion(
  resumeId: string,
  question: string
): Promise<AskResponse> {
  return apiFetch<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify({
      resume_id: resumeId,
      question
    })
  });
}

/* ---------------- JOB ---------------- */

export async function uploadJob(
  description: string
): Promise<JobUploadResponse> {
  return apiFetch<JobUploadResponse>("/upload-job", {
    method: "POST",
    body: JSON.stringify({ description })
  });
}

/* ---------------- MATCHING ---------------- */

export async function matchResumeFast(resumeId: string, jobId: string) {
  const res = await fetch(`${API_BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
  });

  if (!res.ok) {
    throw new Error("Match request failed");
  }

  return res.json();
}

export async function getAiCoach(resumeId: string, jobId: string) {
  const res = await fetch(`${API_BASE}/match/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
  });

  if (!res.ok) throw new Error("AI Coach request failed");
  return res.json();
}

export async function getRoadmap(resumeId: string, jobId: string) {
  const res = await fetch(`${API_BASE}/match/roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
  });

  if (!res.ok) throw new Error("Roadmap request failed");
  return res.json();
}
