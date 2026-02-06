import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  refreshAuthSession,
  shouldRefreshAccessToken,
} from "@/lib/auth";

export const middleware = async (request: NextRequest) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-search", request.nextUrl.search);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  if (!refreshToken || !shouldRefreshAccessToken(accessToken)) {
    return response;
  }

  const refreshed = await refreshAuthSession(refreshToken);
  if (!refreshed) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: refreshed.expiresIn,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
};

export const config = {
  matcher: ["/words/:path*"],
};
