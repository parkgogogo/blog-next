# DESIGN.md

参照对象：openai.com 的文章页（如 *Introducing GPT-5*、*Why language models hallucinate*）与 Research 列表页。
数值取自 2026-10 线上页面的计算样式。实现在 `src/app/globals.css`。

## 原则

- 内容就是设计：白底、黑字、无阴影、无渐变，只靠字号、字重和留白建立层级。
- 标题统一字重 500，正文 400，只有表头和图表标题用 600。
- 评测数据（表格、图表、图注）是一等公民，样式克制、对齐严谨。
- 只有两个页面：首页文章列表 `/`，文章详情 `/blog/[slug]`（译文 `/blog/[slug]/[lang]`）；`/markdown` 是渲染测试页。

## Token

| 用途 | 值 |
| --- | --- |
| 背景 | `#ffffff` |
| 文本 | `#000000` |
| 次级文本 | `rgba(0,0,0,.6)` |
| 分割线 | `rgba(0,0,0,.12)` |
| 浅灰面 | `#f4f4f4`（代码块、提示块、胶囊按钮） |
| 强调色 | `#2f4fb5`（脚注、焦点、图表主色） |
| 字体 | Inter + PingFang SC / Noto Sans SC；代码 SF Mono 系 |
| 页边距 | 24px（< 768px）/ 32px |

## 暗色

参照 developers.openai.com 的暗色主题。默认跟随系统，页头右侧的按钮可手动切换，选择存在 localStorage，首帧前由 `<head>` 里的脚本套用（`html[data-theme]`）；切回与系统一致的主题时清除记录。

| 用途 | 值 |
| --- | --- |
| 背景 | `#000000` |
| 文本 | `#dcdcdc` |
| 次级文本 | `#8f8f8f` |
| 分割线 | `rgba(255,255,255,.12)` |
| 浅灰面 / 深一级面 | `#181818` / `#303030` |
| 强调色 | `#7b93e8` |
| 代码高亮 | `#e9950c` `#2e95d3` `#00a67d` `#df3079` `#f22c3d`（OpenAI 的五个语法色） |

颜色全部写成 `globals.css` 的变量；图表与 Mermaid 的 SVG 只引用变量（`--chart-*`、`--mm-*`），随主题切换。

## 排版

| 元素 | 规格 |
| --- | --- |
| 文章标题 | 64px / 1.04 / 500 / -0.03em，居中（移动端 36px） |
| 元信息 | 14px，日期黑色 500，分类与阅读时间灰色，间隔 16px |
| 正文 | 17px / 1.75，正文栏 676px，段距 24px |
| h2 / h3 / h4 | 30px / 22px / 18px，字重 500，上方留白 80 / 56 / 40px |
| 链接 | 黑色，1px 下划线，偏移 4px |
| 表格 | 14px，只有横线，单元格 padding 12px，表头 600，右对齐列用等宽数字 |
| 图注 | 14px 灰色，与正文栏左对齐；图表说明用斜体 |
| 目录 | ≥1200px 显示，左侧 sticky，贴在正文栏左侧 40px（空间不够时退回页边距），13px 灰色，h3 缩进 14px，当前小节变黑 |

## 布局

- 图片、视频、Mermaid、封面图最宽与正文栏一致（676px），不突破；小图保持原尺寸居中。
- 图表与表格留在正文栏内。
- 文末：正文结束即结束，不放作者、标签或推荐阅读，直接接页脚。
- 首页：600px 居中单栏，不用分割线。44px 圆形头像 + 姓名 24px 同行，下方 16px 灰色中英双行简介（链接只在页头页脚）；下方 14px 分类标签页；列表每项为 17px 标题、15px 灰色摘要（两行截断）、13px 日期与分类，项间距 48px（移动端 40px）；顶部留白 120px（移动端 64px），简介到列表 96px（移动端 72px）。

- 页头：28px 圆形头像 + 「Parker」，右侧 GitHub、RSS 与主题切换。
- 页脚：只有居中的「© 年份 parkgogogo.site」，14px 灰色。

## 多语言

- 支持中文、英文、日文。原文语言写在 frontmatter `lang`（缺省 `zh`），译文与原文同目录，命名 `<slug>.<lang>.md`。
- 译文的标题、摘要、正文用自己的；日期、标签、分类、封面、链接没写就沿用原文。
- 原文地址不变（`/blog/<slug>`），译文为 `/blog/<slug>/<lang>`；原文语言访问 `/<lang>` 返回 404，避免重复内容。
- 只有存在多个语言版本时，文章元信息下方显示「中文 English 日本語」切换（13px，当前语言变黑）；首页对应条目的元信息末尾标注 `ZH / EN / JA`。
- 每个版本都有自己的 canonical，并通过 hreflang（含 x-default 指向原文）、sitemap alternates 和 JSON-LD 的 `translationOfWork` / `workTranslation` 互相声明。
- 日文页面的字体优先 Hiragino Sans / Noto Sans JP，避免汉字按简体字形渲染。

## Markdown 扩展

- `> [!NOTE]` 等 GitHub 提示块：浅灰底 + 彩色圆点标签。
- `` ```chart ``：JSON 描述的柱状图 / 折线图，服务端渲染 SVG，规格见 `src/components/markdown/Chart.tsx`。
- `` ```mermaid ``：服务端渲染为中性灰 SVG。
- 公式：`$$...$$`（行内与块级），单个 `$` 不解析，避免价格被误判。
- 独占一段的图片转为 `<figure>`，title 优先作为图注，其次 alt（文件名类 alt 忽略）。
- 紧挨表格、以 `表 N ｜`（或 `Table N:`）开头的段落作为表注，与表格合成 `<figure>`，表注统一显示在表格下方，样式同图注。
- frontmatter：`title` `date` `excerpt` `subtitle` `category` `tags` `authors` `cover` `links[{label, href}]` `lang`。
