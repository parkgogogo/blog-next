import { DailyTaskPageClient } from "@/app/words/daily/daily-task-page-client";
import { requireUser } from "@/lib/auth/server";

export default async function DailyWordsPage() {
  await requireUser();
  return <DailyTaskPageClient />;
}
