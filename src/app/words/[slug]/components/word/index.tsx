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
    <div className="mb-4">
      <h3 className="mb-2" onClick={handlePlay}>
        <span>{text}</span>
      </h3>
      <div
        className={`flex gap-2 text-sm ${styles.phon}`}
        dangerouslySetInnerHTML={{ __html: phon }}
      ></div>
      <audio ref={audioRef} src={`/api/speech/${text}`} />
    </div>
  );
};
