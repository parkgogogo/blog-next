import { NextResponse } from "next/server";
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  refreshAuthSession,
  setAuthCookies,
} from "@/lib/auth";

type RefreshPayload = {
  client?: "web" | "extension";
  refreshToken?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as RefreshPayload | null;
  const client = payload?.client ?? "web";
  const refreshToken =
    client === "extension"
      ? payload?.refreshToken ?? null
      : getRefreshTokenFromRequest(request);

  if (!refreshToken) {
    return NextResponse.json({ error: "missing_refresh_token" }, { status: 400 });
  }

  const refreshed = await refreshAuthSession(refreshToken);
  if (!refreshed) {
    const response = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (client !== "extension") {
      clearAuthCookies(response);
    }
    return response;
  }

  const response = NextResponse.json(refreshed);
  if (client !== "extension") {
    setAuthCookies(response, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      maxAge: refreshed.expiresIn,
    });
  }
  return response;
}
