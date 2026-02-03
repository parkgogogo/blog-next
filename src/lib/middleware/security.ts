import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";

type AuthResult =
  | { ok: true; token: string }
  | { ok: false; response: NextResponse };

type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

type SupabaseAuthResult =
  | { ok: true; userId: string; accessToken: string }
  | { ok: false; response: NextResponse };

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const publicRateLimitStore = new Map<string, { count: number; resetAt: number }>();

const readProxyKeys = () => {
  const single = process.env.AI_PROXY_KEY;
  const list = process.env.AI_PROXY_KEYS;
  const merged = [single, list]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(merged);
};

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || "unknown";
};

export const requireApiKey = (request: NextRequest): AuthResult => {
  const keys = readProxyKeys();

  if (keys.size === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "AI proxy keys are not configured" },
        { status: 500 },
      ),
    };
  }

  const headerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const apiKey = request.headers.get("x-api-key")?.trim();
  const token = headerToken || apiKey;

  if (!token || !keys.has(token)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, token };
};

export const requireSupabaseAuth = async (
  request: Request,
): Promise<SupabaseAuthResult> => {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await getUserFromAccessToken(accessToken);
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, userId: user.id, accessToken };
};

export const enforceRateLimit = (
  request: NextRequest,
  token: string,
): RateLimitResult => {
  const max = Number(process.env.AI_API_RATE_LIMIT_MAX ?? 120);
  const windowMs = Number(process.env.AI_API_RATE_LIMIT_WINDOW_MS ?? 60_000);
  const clientKey = `${token}:${getClientIp(request)}`;

  const now = Date.now();
  const entry = rateLimitStore.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        },
      ),
    };
  }

  entry.count += 1;
  rateLimitStore.set(clientKey, entry);
  return { ok: true };
};

export const enforcePublicRateLimit = (
  request: NextRequest,
  options?: { max?: number; windowMs?: number; scope?: string },
): RateLimitResult => {
  const max = Number(options?.max ?? 60);
  const windowMs = Number(options?.windowMs ?? 60_000);
  const scope = options?.scope ?? "public";
  const clientKey = `${scope}:${getClientIp(request)}`;

  const now = Date.now();
  const entry = publicRateLimitStore.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    publicRateLimitStore.set(clientKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        },
      ),
    };
  }

  entry.count += 1;
  publicRateLimitStore.set(clientKey, entry);
  return { ok: true };
};

const base64UrlEncode = (input: string | Buffer) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (input: string) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64").toString();
};

export const createSpeechToken = (payload: {
  cardId: string;
  date: string;
  exp: number;
}) => {
  const secret = process.env.SPEECH_TOKEN_SECRET;
  if (!secret) return null;
  const body = JSON.stringify(payload);
  const bodyEncoded = base64UrlEncode(body);
  const signature = createHmac("sha256", secret).update(bodyEncoded).digest();
  const signatureEncoded = base64UrlEncode(signature);
  return `${bodyEncoded}.${signatureEncoded}`;
};

export const verifySpeechToken = (token: string) => {
  const secret = process.env.SPEECH_TOKEN_SECRET;
  if (!secret) return null;
  const [bodyEncoded, signature] = token.split(".");
  if (!bodyEncoded || !signature) return null;
  const expected = base64UrlEncode(
    createHmac("sha256", secret).update(bodyEncoded).digest(),
  );
  if (expected !== signature) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(bodyEncoded)) as {
      cardId?: string;
      date?: string;
      exp?: number;
    };
    if (!parsed.cardId || !parsed.date || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
};
