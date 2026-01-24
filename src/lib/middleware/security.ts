import { NextRequest, NextResponse } from "next/server";

type AuthResult =
  | { ok: true; token: string }
  | { ok: false; response: NextResponse };

type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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
