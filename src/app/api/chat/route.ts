import { NextRequest, NextResponse } from "next/server";
import { AI_TEXT_BASE_URL, AI_TEXT_MODEL, AI_TEXT_TOKEN } from "@/lib/ai";
import { enforceRateLimit, requireApiKey } from "@/lib/middleware/security";

const resolveModel = (modelId?: string, fallback?: string) => {
  return modelId?.trim() || fallback?.trim() || AI_TEXT_MODEL;
};

const ensureAllowedModel = (model: string) => {
  const allowList = process.env.AI_ALLOWED_MODELS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowList || allowList.length === 0) {
    return true;
  }

  return allowList.includes(model);
};

const buildUpstreamUrl = (baseUrl: string) => {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("chat/completions", normalized).toString();
};

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }
  const rateLimit = enforceRateLimit(request, auth.token);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const baseUrl = AI_TEXT_BASE_URL;
  const token = AI_TEXT_TOKEN;

  if (!baseUrl || !token) {
    return NextResponse.json(
      {
        error:
          "AI_TEXT_BASE_URL or AI_TEXT_TOKEN is not configured (or fallback AI_BASE_URL and AI_TOKEN)",
      },
      { status: 500 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { modelId, model, stream, ...rest } = payload as {
    modelId?: string;
    model?: string;
    stream?: boolean;
    [key: string]: unknown;
  };

  const selectedModel = resolveModel(modelId, model);
  if (!ensureAllowedModel(selectedModel)) {
    return NextResponse.json(
      { error: "Model not allowed", model: selectedModel },
      { status: 400 },
    );
  }

  const upstreamPayload = {
    ...rest,
    model: selectedModel,
    stream: Boolean(stream),
  };

  const upstream = await fetch(buildUpstreamUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(upstreamPayload),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return new NextResponse(errorText, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/plain",
      },
    });
  }

  if (upstreamPayload.stream) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const resultText = await upstream.text();
  return new NextResponse(resultText, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
