"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateStoryAction } from "@/app/words/[slug]/story/actions";

export const StoryActions = ({ slug }: { slug: string }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRegenerate = () => {
    startTransition(async () => {
      await regenerateStoryAction(slug);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleRegenerate}
      disabled={isPending}
      className="text-xs uppercase tracking-[0.18em] text-gray-500 hover:text-gray-800 disabled:opacity-50"
    >
      {isPending ? "GENERATING..." : "REGENERATE"}
    </button>
  );
};
