"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

const isValidNextPath = (path: string): boolean => {
  // 只允许以 / 开头的相对路径
  // 拒绝包含 :// (协议) 或 javascript: (javascript 伪协议) 的值
  if (!path.startsWith("/")) return false;
  if (path.includes("://")) return false;
  if (path.toLowerCase().startsWith("javascript:")) return false;
  return true;
};

type OAuthProvider = "github";

const providers: Array<{ id: OAuthProvider; label: string }> = [
  { id: "github", label: "GitHub" },
];

const LoginContent = () => {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const nextPath = useMemo(() => {
    const rawNext = searchParams.get("next") || "/words";
    return isValidNextPath(rawNext) ? rawNext : "/words";
  }, [searchParams]);

  const handleLogin = async (provider: OAuthProvider) => {
    setLoading(provider);
    try {
      const supabase = getBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        nextPath,
      )}`;
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">Sign in</div>
        <div className="login-subtitle">
          使用你的账号登录以继续访问词库与记忆功能。
        </div>
        <div className="login-providers">
          {providers.map((provider) => (
            <button
              key={provider.id}
              className="login-button"
              type="button"
              onClick={() => handleLogin(provider.id)}
              disabled={loading !== null}
            >
              <span className="login-button-label">
                <svg
                  className="login-provider-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.02-.01-1.85-2.78.62-3.37-1.22-3.37-1.22-.46-1.21-1.12-1.53-1.12-1.53-.91-.64.07-.63.07-.63 1.01.07 1.54 1.06 1.54 1.06.9 1.59 2.36 1.13 2.94.86.09-.67.35-1.13.63-1.39-2.22-.26-4.56-1.15-4.56-5.11 0-1.13.39-2.06 1.03-2.78-.1-.26-.45-1.32.1-2.74 0 0 .84-.27 2.75 1.06.8-.23 1.65-.34 2.5-.35.85.01 1.71.12 2.5.35 1.9-1.33 2.75-1.06 2.75-1.06.55 1.42.2 2.48.1 2.74.64.72 1.03 1.65 1.03 2.78 0 3.97-2.35 4.85-4.59 5.1.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.59.69.48A10.22 10.22 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
                  />
                </svg>
                Continue with {provider.label}
              </span>
              {loading === provider.id ? (
                <span className="login-button-status">跳转中…</span>
              ) : (
                <span className="login-button-status">→</span>
              )}
            </button>
          ))}
        </div>
        <div className="login-note">登录后将自动回到原页面。</div>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
