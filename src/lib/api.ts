export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

/* ---------------- TYPES ---------------- */

/* Auth */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  provider: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

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

/**
 * JSON fetch helper for protected endpoints.
 * Always pass accessToken — FastAPI's OAuth2PasswordBearer will 401 without it.
 * Do NOT use this for FormData uploads; build those requests manually so the
 * browser can set Content-Type: multipart/form-data with the correct boundary.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text || "Unknown error"}`);
  }

  return res.json();
}

/* ---------------- AUTH ---------------- */

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail ?? (res.status === 401 ? "Invalid email or password." : "Login failed.");
    throw new Error(msg);
  }

  return res.json();
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail ?? "Registration failed.";
    throw new Error(msg);
  }

  return res.json();
}

export async function refreshTokenApi(
  refreshToken: string
): Promise<TokenRefreshResponse> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error("Session expired. Please log in again.");

  return res.json();
}

export async function logoutUser(accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getMe(accessToken: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch user.");

  return res.json();
}

export async function googleOAuth(idToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/oauth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const status = res.status;
    if (status === 403) throw new Error("Account deactivated. Contact support.");
    if (status === 501) throw new Error("This sign-in method is not available right now.");
    throw new Error(data?.detail ?? "Google sign-in failed.");
  }

  return res.json();
}

export async function githubOAuth(code: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/oauth/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const status = res.status;
    if (status === 400) throw new Error("Sign-in failed. The authorization code may have expired. Please try again.");
    if (status === 403) throw new Error("Account deactivated. Contact support.");
    if (status === 501) throw new Error("This sign-in method is not available right now.");
    throw new Error(data?.detail ?? "GitHub sign-in failed.");
  }

  return res.json();
}

/* ---------------- RESUME ---------------- */

/**
 * Upload a PDF resume.
 * IMPORTANT: Never set Content-Type manually for FormData — the browser must
 * set it to `multipart/form-data; boundary=...` automatically. Only set Authorization.
 */
export async function uploadResume(
  file: File,
  accessToken: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload-resume`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // ✅ Do NOT set Content-Type here — browser sets multipart/form-data + boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  return res.json();
}

export async function askQuestion(
  resumeId: string,
  question: string,
  accessToken: string
): Promise<AskResponse> {
  return apiFetch<AskResponse>(
    "/ask",
    { method: "POST", body: JSON.stringify({ resume_id: resumeId, question }) },
    accessToken
  );
}

/* ---------------- JOB ---------------- */

export async function uploadJob(
  description: string,
  accessToken: string
): Promise<JobUploadResponse> {
  return apiFetch<JobUploadResponse>(
    "/upload-job",
    { method: "POST", body: JSON.stringify({ description }) },
    accessToken
  );
}

/* ---------------- MATCHING ---------------- */

export async function matchResumeFast(
  resumeId: string,
  jobId: string,
  accessToken: string
) {
  return apiFetch(
    "/match",
    { method: "POST", body: JSON.stringify({ resume_id: resumeId, job_id: jobId }) },
    accessToken
  );
}

export async function getAiCoach(
  resumeId: string,
  jobId: string,
  accessToken: string
) {
  return apiFetch(
    "/match/coach",
    { method: "POST", body: JSON.stringify({ resume_id: resumeId, job_id: jobId }) },
    accessToken
  );
}

export async function getRoadmap(
  resumeId: string,
  jobId: string,
  accessToken: string
) {
  return apiFetch(
    "/match/roadmap",
    { method: "POST", body: JSON.stringify({ resume_id: resumeId, job_id: jobId }) },
    accessToken
  );
}
