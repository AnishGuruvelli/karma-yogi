import { Component, useEffect, useState, type ErrorInfo, type FormEvent, type ReactNode } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { StoreProvider } from "@/lib/store";
import { TopNav } from "@/components/TopNav";
import { SplashScreen } from "@/components/SplashScreen";
import { getAuthState, loginWithGoogle, loginWithPassword, logout, registerWithPassword, resetPasswordWithSecret } from "@/lib/api";
import { STANDARD_SECRET_QUESTION } from "@/lib/auth-constants";
import { LotusIcon } from "@/components/LotusIcon";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import DashboardPage from "@/pages/DashboardPage";
import SessionsPage from "@/pages/SessionsPage";
import InsightsPage from "@/pages/InsightsPage";
import DataPage from "@/pages/DataPage";
import ProfilePage from "@/pages/ProfilePage";
import { Toaster } from "@/components/ui/sonner";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

const rememberEmailKey = "karma_auth_remember_email";
const rememberFlagKey = "karma_auth_remember_flag";

function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
  const googleConfigured =
    Boolean(googleClientId) &&
    googleClientId !== "replace-with-google-client-id" &&
    !googleClientId.startsWith("YOUR_");

  const [view, setView] = useState<"login" | "register" | "reset">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedFlag = localStorage.getItem(rememberFlagKey) === "1";
    setRememberMe(savedFlag);
    if (savedFlag) {
      const savedEmail = localStorage.getItem(rememberEmailKey) || "";
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (!googleConfigured) return;
    if (view === "reset") return;
    const mount = document.getElementById("google-signin-button");
    if (!mount) return;

    const render = () => {
      if (!window.google?.accounts?.id) return;
      mount.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (!credential) return;
          try {
            await loginWithGoogle(credential);
            onAuthSuccess();
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            setError(message || "Google sign-in failed.");
          }
        },
      });
      window.google.accounts.id.renderButton(mount, { theme: "outline", size: "large", width: "100%", text: "continue_with" });
    };

    if (window.google?.accounts?.id) {
      render();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      const onLoad = () => render();
      existing.addEventListener("load", onLoad, { once: true });
      return () => existing.removeEventListener("load", onLoad);
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => {};
  }, [view, onAuthSuccess, googleClientId, googleConfigured]);

  const persistRememberEmail = (cleanEmail: string) => {
    if (rememberMe && cleanEmail) {
      localStorage.setItem(rememberFlagKey, "1");
      localStorage.setItem(rememberEmailKey, cleanEmail);
    } else {
      localStorage.removeItem(rememberFlagKey);
      localStorage.removeItem(rememberEmailKey);
    }
  };

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithPassword(cleanEmail, password);
      persistRememberEmail(cleanEmail);
      onAuthSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const normalized = message.toLowerCase();
      if (normalized.includes("invalid email or password")) {
        setError("Wrong email or password.");
      } else if (normalized.includes("password login not enabled")) {
        setError("This account uses Google sign-in (email/password is not enabled).");
      } else {
        setError(message || "Unable to sign in right now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanSecret = secretAnswer.trim();
    if (!cleanEmail || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (cleanName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (cleanSecret.length < 2) {
      setError("Please answer the security question (at least 2 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await registerWithPassword(cleanEmail, cleanName, password, cleanSecret);
      persistRememberEmail(cleanEmail);
      onAuthSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanSecret = secretAnswer.trim();
    if (!cleanEmail || !cleanSecret || !newPassword.trim()) {
      setError("Email, security answer, and new password are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordWithSecret(cleanEmail, cleanSecret, newPassword);
      setView("login");
      setPassword("");
      setConfirmPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSecretAnswer("");
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Unable to reset password. Check your email and security answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const heading =
    view === "login" ? "Welcome back" : view === "register" ? "Create your account" : "Reset your password";
  const sub =
    view === "login"
      ? "Show up. Let it compound."
      : view === "register"
        ? "Begin your practice today."
        : "Answer your security question to set a new password.";

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-md">
            <LotusIcon size={26} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          {view !== "reset" && (
            <form className="space-y-4" onSubmit={view === "login" ? submitLogin : submitRegister}>
              {view === "register" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Full name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Arjun Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  {view === "login" && (
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => { setView("reset"); setError(""); }}>
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    type={showPassword ? "text" : "password"}
                    placeholder={view === "register" ? "At least 8 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={view === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {view === "register" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {view === "register" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Security question</label>
                  <p className="text-xs text-muted-foreground">{STANDARD_SECRET_QUESTION}</p>
                  <input
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Your answer"
                    value={secretAnswer}
                    onChange={(e) => setSecretAnswer(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}

              {view === "login" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me for 30 days.
                </label>
              )}

              {view === "register" && (
                <p className="text-xs text-muted-foreground">
                  By signing up you agree to our <span className="font-medium text-foreground">Terms</span> and{" "}
                  <span className="font-medium text-foreground">Privacy Policy</span>.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                type="submit"
              >
                {submitting ? "Please wait..." : view === "login" ? "Sign in →" : "Create account →"}
              </button>
            </form>
          )}

          {view === "reset" && (
            <form className="space-y-4" onSubmit={submitReset}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Security question</label>
                <p className="text-xs text-muted-foreground">{STANDARD_SECRET_QUESTION}</p>
                <input
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Your answer"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">New password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm new password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    type={showConfirmNew ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmNew((v) => !v)}
                    aria-label={showConfirmNew ? "Hide password" : "Show password"}
                  >
                    {showConfirmNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                type="submit"
              >
                {submitting ? "Please wait..." : "Update password →"}
              </button>

              <button
                type="button"
                className="w-full text-center text-sm font-medium text-primary hover:underline"
                onClick={() => { setView("login"); setError(""); }}
              >
                Back to sign in
              </button>
            </form>
          )}

          {view !== "reset" && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div id="google-signin-button" className="w-full" />
              {!googleConfigured && (
                  <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                    Google sign-in is disabled until you set a real{" "}
                    <span className="font-mono text-foreground">VITE_GOOGLE_CLIENT_ID</span> in{" "}
                    <span className="font-mono text-foreground">.env</span> (then restart{" "}
                    <span className="font-mono text-foreground">npm run dev</span>).
                  </div>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {view === "login" ? (
            <>
              New to Karma Yogi?{" "}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setView("register"); setError(""); }}>
                Create an account
              </button>
            </>
          ) : view === "register" ? (
            <>
              Already have an account?{" "}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setView("login"); setError(""); }}>
                Sign in
              </button>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. Please try again.</p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthed, setIsAuthed] = useState(Boolean(getAuthState()));

  useEffect(() => {
    const syncAuthState = () => setIsAuthed(Boolean(getAuthState()));
    window.addEventListener("karma-auth-changed", syncAuthState);
    return () => window.removeEventListener("karma-auth-changed", syncAuthState);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {!showSplash && !isAuthed && <AuthScreen onAuthSuccess={() => setIsAuthed(true)} />}
      {!showSplash && isAuthed && (
        <StoreProvider>
          <TopNav onLogout={() => { void logout(); }} />
          <main className="min-h-[calc(100vh-4rem)] pb-24 sm:pb-0">
            <AppErrorBoundary>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/data" element={<DataPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppErrorBoundary>
          </main>
          <Toaster />
        </StoreProvider>
      )}
    </>
  );
}
