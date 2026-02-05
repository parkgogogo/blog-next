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

export const getUserFromAccessToken = async (accessToken: string) => {
  const supabase = getSupabaseClient({ accessToken });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return null;
  return data.user ?? null;
};
