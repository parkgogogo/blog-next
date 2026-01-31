"use client";

import { useEffect, useState } from "react";
import { DailyTaskClient } from "@/app/words/daily/daily-task-client";
import { loadDailyTaskAction } from "@/app/words/daily/actions";

type DailyTaskCard = {
  id: string;
  sentence: string;
  word_ids: string[];
  words: string[];
  word_count: number;
  char_count: number;
};

type WordContext = {
  id: string;
  text: string;
  contextLine: string;
};

type LoadResult = {
  date: string;
  cards: DailyTaskCard[];
  wordContexts: Record<string, WordContext>;
};

const pad = (value: number) => String(value).padStart(2, "0");

const getLocalDateSlug = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const DailyTaskPageClient = () => {
  const [localDate] = useState(() => getLocalDateSlug());
  const [result, setResult] = useState<LoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await loadDailyTaskAction(localDate);
        if (cancelled) return;
        setResult(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载失败");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [localDate]);

  if (error) {
    return (
      <div className="daily-page">
        <div className="daily-progress">
          <div className="daily-progress-bar" style={{ width: "0%" }} />
        </div>
        <div className="daily-date">{localDate}</div>
        <div className="daily-shell">
          <div className="daily-sentence">任务加载失败：{error}</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="daily-page">
        <div className="daily-progress">
          <div className="daily-progress-bar" style={{ width: "0%" }} />
        </div>
        <div className="daily-date">{localDate}</div>
        <div className="daily-shell">
          <div className="daily-sentence">任务加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <DailyTaskClient
      date={result.date}
      cards={result.cards}
      wordContexts={result.wordContexts}
    />
  );
};
