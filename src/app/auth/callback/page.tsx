"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

const CallbackContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isExtensionDone, setIsExtensionDone] = useState(false);
  const hasPostedRef = useRef(false);
  const isExtension = searchParams.get("client") === "extension";

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");
      const nextPath = searchParams.get("next") || "/words";
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code && !hasPostedRef.current) {
        hasPostedRef.current = true;
        window.postMessage(
          { type: "supabase_oauth_code", code },
          "https://www.parkgogogo.me",
        );
      }

      if (!code && !accessToken) {
        setError(
          errorDescription
            ? decodeURIComponent(errorDescription)
            : "登录失败：缺少 code。",
        );
        return;
      }

      const supabase = getBrowserSupabaseClient();
      let sessionAccessToken = accessToken;
      let sessionRefreshToken = refreshToken;
      if (code) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (
          exchangeError ||
          !data.session?.access_token ||
          !data.session?.refresh_token
        ) {
          setError(exchangeError?.message || "登录失败：无法获取会话。");
          return;
        }
        sessionAccessToken = data.session.access_token;
        sessionRefreshToken = data.session.refresh_token;
      }

      if (!sessionAccessToken || !sessionRefreshToken) {
        setError("登录失败：无法获取会话。");
        return;
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: sessionAccessToken,
          refreshToken: sessionRefreshToken,
        }),
      });

      if (!response.ok) {
        setError("登录失败：无法保存会话。");
        return;
      }

      if (isExtension) {
        setIsExtensionDone(true);
        return;
      }

      router.replace(nextPath);
    };

    run().catch(() => setError("登录失败：未知错误。"));
  }, [isExtension, router, searchParams]);

  const subtitle = error
    ? "登录失败"
    : isExtension
      ? isExtensionDone
        ? "已完成登录，请关闭此窗口返回插件。"
        : "请稍候，正在完成登录…"
      : "请稍候，即将进入词库…";

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">正在完成登录</div>
        <div className="login-subtitle">{subtitle}</div>
        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  );
};

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
