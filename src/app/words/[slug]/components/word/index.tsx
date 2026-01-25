"use client";

import { useRef } from "react";
import styles from "./index.module.css";

export const Index: React.FC<{ text: string; phon: string }> = ({
  text,
  phon,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = async () => {
    audioRef.current?.play();
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="text-base font-semibold text-foreground"
        onClick={handlePlay}
      >
        <span>{text}</span>
      </button>
      <div
        className={`flex gap-2 text-sm ${styles.phon}`}
        dangerouslySetInnerHTML={{ __html: phon }}
      ></div>
      <audio ref={audioRef} src={`/api/speech/${text}`} />
    </div>
  );
};
