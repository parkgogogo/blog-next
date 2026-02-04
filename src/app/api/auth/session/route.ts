import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { setAuthCookies } from "@/lib/auth";

type SessionPayload = {
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SessionPayload | null;
  if (!payload?.accessToken || !payload?.refreshToken) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = getSupabaseClient({ accessToken: payload.accessToken });
  const { data, error } = await supabase.auth.getUser(payload.accessToken);
  if (error || !data.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response, {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
  return response;
}
