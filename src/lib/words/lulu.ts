import { LULU_ENDPOINT, LULU_ENDPOINT_PRE } from "@/lib/words/constants";
import type { IResponse, ILuluWord } from "@/lib/words/types";

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 8000,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const getWordsLength = async () => {
  try {
    const response = await fetchWithTimeout(LULU_ENDPOINT_PRE, {
      headers: {
        ["Cookie"]: process.env.LULU_COOKIE || "",
        ["Content-Type"]: "application/json",
      },
      next: {
        revalidate: 60 * 5,
      },
    });
    const result = await response.json();
    if (typeof result.recordsTotal === "number") {
      return result.recordsTotal;
    }
  } catch {
    return 0;
  }
};

export const getLuluWords = async (): Promise<ILuluWord[]> => {
  try {
    const totalLength = await getWordsLength();
    const result = await fetchWithTimeout(`${LULU_ENDPOINT}&length=${totalLength}`, {
      headers: {
        ["Cookie"]: process.env.LULU_COOKIE || "",
        ["Content-Type"]: "application/json",
      },
      next: { revalidate: 60 * 5 },
    });

    const parsedResult: IResponse = await result.json();

    if (Array.isArray(parsedResult.data)) {
      return parsedResult.data;
    }
    return [];
  } catch {
    return [];
  }
};
