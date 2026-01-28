"use client";

import { useRef } from "react";
import { Link2 } from "lucide-react";
import styles from "./index.module.css";

export const Index: React.FC<{
  text: string;
  phon: string;
  sourceLink?: string | null;
}> = ({ text, phon, sourceLink }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = async () => {
    audioRef.current?.play();
  };

  return (
    <div className="mb-4">
      <h3 className="mb-2 flex items-center gap-2" onClick={handlePlay}>
        <span>{text}</span>
        {sourceLink ? (
          <a
            className={styles.sourceLink}
            href={sourceLink}
            target="_blank"
            rel="noreferrer"
            aria-label="Source link"
            onClick={(event) => event.stopPropagation()}
          >
            <Link2 size={14} />
          </a>
        ) : null}
      </h3>
      <div
        className={`flex gap-2 text-sm ${styles.phon}`}
        dangerouslySetInnerHTML={{ __html: phon }}
      ></div>
      <audio ref={audioRef} src={`/api/speech/${text}`} />
    </div>
  );
};
