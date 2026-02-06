import type { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const ACCESS_TOKEN_COOKIE = "sb-access-token";
export const REFRESH_TOKEN_COOKIE = "sb-refresh-token";

const parseCookieHeader = (header: string | null) => {
  if (!header) return new Map<string, string>();
  const map = new Map<string, string>();
  header.split(";").forEach((part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return;
    map.set(rawKey, decodeURIComponent(rest.join("=")));
  });
  return map;
};

export const getAccessTokenFromRequest = (request: Request) => {
  const headerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (headerToken) return headerToken;
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
};

export const getRefreshTokenFromRequest = (request: Request) => {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies.get(REFRESH_TOKEN_COOKIE) ?? null;
};

export const setAuthCookies = (
  response: NextResponse,
  payload: { accessToken: string; refreshToken: string; maxAge?: number },
) => {
  const accessMaxAge = payload.maxAge ?? 60 * 60;
  const refreshMaxAge = 60 * 60 * 24 * 30;
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
  });
};

export const clearAuthCookies = (response: NextResponse) => {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

const decodeJwtExp = (token: string): number | null => {
  const [, payload = ""] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const raw = atob(padded);
    const parsed = JSON.parse(raw) as { exp?: number };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
};

export const shouldRefreshAccessToken = (
  accessToken: string | null | undefined,
  options?: { thresholdSeconds?: number },
) => {
  if (!accessToken) return true;
  const exp = decodeJwtExp(accessToken);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  const threshold = options?.thresholdSeconds ?? 15 * 60;
  return exp - now <= threshold;
};

export const refreshAuthSession = async (refreshToken: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (
    error ||
    !data.session?.access_token ||
    !data.session?.refresh_token
  ) {
    return null;
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in ?? 60 * 60,
    expiresAt: new Date(
      Date.now() + (data.session.expires_in ?? 60 * 60) * 1000,
    ).toISOString(),
  };
};

export const getUserFromAccessToken = async (accessToken: string) => {
  const supabase = getSupabaseClient({ accessToken });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return null;
  return data.user ?? null;
};
