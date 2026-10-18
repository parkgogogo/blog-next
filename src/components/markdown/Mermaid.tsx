import { render } from "pele";

// 和 globals.css 的 --font-sans 一致，服务端按它估算文字宽度
const FONT_FAMILY =
  '"Inter", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';

// 同一页多张图时，SVG 内部 id 不能重复
function idPrefix(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  return `mm${(hash >>> 0).toString(36)}-`;
}

/**
 * 服务端用 Pele 渲染成 SVG。颜色和字体走 --pele-* 变量（见 globals.css 的 .md-mermaid），
 * 随亮暗主题切换
 */
export default function Mermaid({ source }: { source: string }) {
  const text = source.trim();

  try {
    const { svg } = render(text, { fontFamily: FONT_FAMILY, idPrefix: idPrefix(text) });

    return (
      <figure className="md-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
    );
  } catch {
    return <pre className="md-block-error">{`Mermaid render failed.\n\n${text}`}</pre>;
  }
}
