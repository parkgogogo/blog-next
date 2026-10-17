/**
 * 文章支持的语言。原文的语言写在 frontmatter 的 `lang`（缺省 zh），
 * 译文与原文同目录，文件名加语言后缀：`<slug>.en.md`、`<slug>.ja.md`、`<slug>.zh.md`。
 */
export const POST_LANGUAGES = ["zh", "en", "ja"] as const;

export type PostLanguage = (typeof POST_LANGUAGES)[number];

export const DEFAULT_POST_LANGUAGE: PostLanguage = "zh";

export const LANGUAGE_INFO: Record<
  PostLanguage,
  { label: string; short: string; hreflang: string; ogLocale: string }
> = {
  zh: { label: "中文", short: "ZH", hreflang: "zh-CN", ogLocale: "zh_CN" },
  en: { label: "English", short: "EN", hreflang: "en", ogLocale: "en_US" },
  ja: { label: "日本語", short: "JA", hreflang: "ja", ogLocale: "ja_JP" },
};

export function isPostLanguage(value: unknown): value is PostLanguage {
  return typeof value === "string" && (POST_LANGUAGES as readonly string[]).includes(value);
}

/** 按固定顺序（中、英、日）排列 */
export function sortLanguages(languages: PostLanguage[]): PostLanguage[] {
  return POST_LANGUAGES.filter((lang) => languages.includes(lang));
}
