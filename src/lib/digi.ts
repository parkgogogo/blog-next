/**
 * 数码世界的纯函数工具：把文章映射成卡片属性、进化阶段与日期格式。
 * 全部是确定性计算，保证 SSR 与客户端输出一致。
 */
import type { BlogPost } from "@/types/blog";

export type DigiAttribute = "vaccine" | "data" | "virus";

export interface DigiStage {
  id: "rookie" | "champion" | "ultimate" | "mega";
  zh: string;
  en: string;
}

export const DIGI_STAGES: DigiStage[] = [
  { id: "rookie", zh: "成长期", en: "ROOKIE" },
  { id: "champion", zh: "成熟期", en: "CHAMPION" },
  { id: "ultimate", zh: "完全体", en: "ULTIMATE" },
  { id: "mega", zh: "究极体", en: "MEGA" },
];

const ATTRIBUTE_LABEL: Record<DigiAttribute, string> = {
  vaccine: "VACCINE",
  data: "DATA",
  virus: "VIRUS",
};

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function postAttribute(post: Pick<BlogPost, "slug">): DigiAttribute {
  const attributes: DigiAttribute[] = ["vaccine", "data", "virus"];
  return attributes[hashString(post.slug) % attributes.length];
}

export function attributeLabel(attribute: DigiAttribute): string {
  return ATTRIBUTE_LABEL[attribute];
}

function stageIndex(post: Pick<BlogPost, "readingTime">): number {
  const minutes = post.readingTime ?? 1;

  if (minutes <= 3) return 0;
  if (minutes <= 6) return 1;
  if (minutes <= 10) return 2;
  return 3;
}

/** 阅读时间越长，文章“进化”得越完全 */
export function postStage(post: Pick<BlogPost, "readingTime">): DigiStage {
  return DIGI_STAGES[stageIndex(post)];
}

export interface DigimonForm {
  /** 对应 public/digimon 下的文件名 */
  id: string;
  name: string;
}

export interface PartnerLine {
  tamer: string;
  forms: [DigimonForm, DigimonForm, DigimonForm, DigimonForm];
}

/** 驯兽师三人组的搭档恰好覆盖三种属性 */
export const PARTNER_LINES: Record<DigiAttribute, PartnerLine> = {
  virus: {
    tamer: "TAKATO",
    forms: [
      { id: "guilmon", name: "Guilmon" },
      { id: "growmon", name: "Growmon" },
      { id: "megalogrowmon", name: "MegaloGrowmon" },
      { id: "dukemon", name: "Dukemon" },
    ],
  },
  data: {
    tamer: "RUKI",
    forms: [
      { id: "renamon", name: "Renamon" },
      { id: "kyubimon", name: "Kyubimon" },
      { id: "taomon", name: "Taomon" },
      { id: "sakuyamon", name: "Sakuyamon" },
    ],
  },
  vaccine: {
    tamer: "JIANLIANG",
    forms: [
      { id: "terriermon", name: "Terriermon" },
      { id: "galgomon", name: "Galgomon" },
      { id: "rapidmon", name: "Rapidmon" },
      { id: "saintgalgomon", name: "Saint Galgomon" },
    ],
  },
};

export interface PartnerForm {
  /** 对应 public/digimon/dot 下的 D-Ark 点阵文件名 */
  id: string;
  name: string;
  stage: { id: "rookie" | "mega" | "blast"; zh: string; en: string };
  art: { src: string; width: number; height: number };
}

/**
 * 站长的搭档：小妖兽。
 * 原作里它从成长期直接进化为究极体魔王兽，之后又觉醒爆炸形态。
 * 立绘为 Codex image_gen 以官方设定为参考、按 TV 动画画风二创（原作比例）。
 */
export const MY_PARTNER: PartnerForm[] = [
  {
    id: "impmon",
    name: "Impmon",
    stage: { id: "rookie", zh: "成长期", en: "ROOKIE" },
    art: { src: "/digimon/art/impmon-cute.webp", width: 713, height: 900 },
  },
  {
    id: "beelzebumon",
    name: "Beelzebumon",
    stage: { id: "mega", zh: "究极体", en: "MEGA" },
    art: { src: "/digimon/art/beelzebumon-anime.webp", width: 861, height: 900 },
  },
  {
    id: "beelzebumon-blast",
    name: "Beelzebumon BM",
    stage: { id: "blast", zh: "究极体 · 爆炸形态", en: "BLAST MODE" },
    art: { src: "/digimon/art/beelzebumon-blast-4wings.webp", width: 889, height: 900 },
  },
];

/** 文章卡面上的数码宝贝：属性决定进化线，阅读时长决定形态 */
export function postDigimon(
  post: Pick<BlogPost, "slug" | "readingTime">
): DigimonForm {
  return PARTNER_LINES[postAttribute(post)].forms[stageIndex(post)];
}

export function cardNumber(index: number): string {
  return `No.${String(index + 1).padStart(3, "0")}`;
}

/** 2026.06.09 */
export function digiDate(input: string | Date): string {
  const date = new Date(input);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}.${month}.${day}`;
}

/** 卡片侧边磁条：由 slug 生成的确定性条码宽度序列 */
export function barcodeBars(seed: string, count = 28): number[] {
  let hash = hashString(seed);
  const bars: number[] = [];

  for (let index = 0; index < count; index += 1) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
    bars.push(1 + (hash % 3));
  }

  return bars;
}
