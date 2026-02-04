import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, getUserFromAccessToken } from "@/lib/auth";

const resolveNextPath = async () => {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname");
  const search = headerList.get("x-search");
  return pathname && pathname.startsWith("/")
    ? `${pathname}${search || ""}`
    : "/words";
};

export const getServerAuth = async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!accessToken) {
    return null;
  }

  const user = await getUserFromAccessToken(accessToken);
  if (!user) return null;

  return { user, accessToken };
};

export const requireUser = async () => {
  const auth = await getServerAuth();
  if (!auth) {
    const nextPath = await resolveNextPath();
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return auth.user;
};

export const requireAuth = async () => {
  const auth = await getServerAuth();
  if (!auth) {
    const nextPath = await resolveNextPath();
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return auth;
};
