/**
 * 动画「第 X 话」标题卡：区块之间的过渡。
 */
export function EpisodeTitle({
  no,
  title,
  en,
  id,
}: {
  no: string;
  title: string;
  en: string;
  id?: string;
}) {
  return (
    <div className="episode-title">
      <span className="episode-title__no">{no}</span>
      <h2 id={id} className="episode-title__name">
        {title}
      </h2>
      <span className="episode-title__en font-mono">{en}</span>
    </div>
  );
}
