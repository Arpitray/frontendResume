import { create } from "zustand";
import {
  API_BASE,
  loginUser,
  registerUser,
  refreshTokenApi,
  logoutUser,
  getMe,
  googleOAuth,
  githubOAuth,
  User,
} from "../lib/api";

const REFRESH_TOKEN_KEY = "rt";

/* ------------------------------------------------------------------ */
/*  State shape                                                          */
/* ------------------------------------------------------------------ */

interface AuthState {
  /** Current user profile — null when not logged in. */
  user: User | null;
  /** Short-lived access token kept in memory only (never localStorage). */
  accessToken: string | null;
  /** True while any async auth operation is in flight. */
  isLoading: boolean;
  /** True once the initial session restore attempt has completed. */
  isInitialized: boolean;

  /* ---- Actions ---- */

  /** Log in with email + password. Throws on failure. */
  login: (email: string, password: string) => Promise<void>;

  /** Register a new account. Throws on failure. */
  register: (email: string, password: string, name: string) => Promise<void>;

  /** Sign in with a Google id_token obtained from @react-oauth/google. */
  loginWithGoogle: (idToken: string) => Promise<void>;

  /** Sign in with a GitHub authorization code from the OAuth callback. */
  loginWithGithub: (code: string) => Promise<void>;

  /** Log out — blacklists token on server and clears local state. */
  logout: () => Promise<void>;

  /**
   * Exchange the stored refresh token for a new token pair.
   * Returns true on success, false if the refresh token is missing / expired.
   */
  refreshSession: () => Promise<boolean>;

  /**
   * Call once on app mount (in a client component or layout).
   * If a refresh token exists in localStorage, it exchanges it for a fresh
   * access token and fetches the current user profile, restoring the session
   * silently across page reloads.
   */
  initialize: () => Promise<void>;

  /**
   * Authenticated fetch wrapper — automatically injects the Authorization
   * header, and on a 401 attempts one token refresh + retry before giving up.
   * Use this for every protected API call in lieu of raw fetch().
   */
  authFetch: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function persistRefreshToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function clearStoredRefreshToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/* ------------------------------------------------------------------ */
/*  Store                                                                */
/* ------------------------------------------------------------------ */

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,

  /* ---------------------------------------------------------------- */
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await loginUser(email, password);
      persistRefreshToken(data.refresh_token);
      set({ user: data.user, accessToken: data.access_token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const data = await registerUser(email, password, name);
      persistRefreshToken(data.refresh_token);
      set({ user: data.user, accessToken: data.access_token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  loginWithGoogle: async (idToken) => {
    set({ isLoading: true });
    try {
      const data = await googleOAuth(idToken);
      persistRefreshToken(data.refresh_token);
      set({ user: data.user, accessToken: data.access_token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  loginWithGithub: async (code) => {
    set({ isLoading: true });
    try {
      const data = await githubOAuth(code);
      persistRefreshToken(data.refresh_token);
      set({ user: data.user, accessToken: data.access_token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  logout: async () => {
    const { accessToken } = get();
    // Fire-and-forget server blacklist — best effort
    if (accessToken) {
      logoutUser(accessToken).catch(() => null);
    }
    clearStoredRefreshToken();
    set({ user: null, accessToken: null });
  },

  /* ---------------------------------------------------------------- */
  refreshSession: async () => {
    const storedToken = getStoredRefreshToken();
    if (!storedToken) return false;

    try {
      const data = await refreshTokenApi(storedToken);
      persistRefreshToken(data.refresh_token);
      set({ accessToken: data.access_token });
      return true;
    } catch {
      // Refresh token is invalid / expired — wipe everything
      clearStoredRefreshToken();
      set({ user: null, accessToken: null });
      return false;
    }
  },

  /* ---------------------------------------------------------------- */
  initialize: async () => {
    const storedToken = getStoredRefreshToken();
    if (!storedToken) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true });
    try {
      const tokenData = await refreshTokenApi(storedToken);
      persistRefreshToken(tokenData.refresh_token);

      const user = await getMe(tokenData.access_token);
      set({
        user,
        accessToken: tokenData.access_token,
        isLoading: false,
        isInitialized: true,
      });
    } catch {
      // Stale or invalid refresh token — silently clear
      clearStoredRefreshToken();
      set({
        user: null,
        accessToken: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  /* ---------------------------------------------------------------- */
  authFetch: async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const makeRequest = (token: string) =>
      fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      });

    let { accessToken } = get();

    // First attempt
    if (!accessToken) {
      const refreshed = await get().refreshSession();
      if (!refreshed) throw new Error("Not authenticated.");
      accessToken = get().accessToken;
    }

    let res = await makeRequest(accessToken!);

    // On 401 — attempt one token refresh then retry
    if (res.status === 401) {
      const refreshed = await get().refreshSession();
      if (!refreshed) throw new Error("Session expired. Please log in again.");
      accessToken = get().accessToken;
      res = await makeRequest(accessToken!);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error ${res.status}: ${text || "Unknown error"}`);
    }

    return res.json() as Promise<T>;
  },
}));
