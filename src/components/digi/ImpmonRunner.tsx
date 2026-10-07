"use client";

import { useEffect, useRef } from "react";

/**
 * 小妖兽跑酷 2.0：致敬 Chrome 断网小恐龙。
 *
 * - 三层视差：远景新宿天际线 / 近景商店街 / 地面，随明暗主题切换昼夜
 * - 地面障碍：Bug 甲虫、病毒史莱姆、D-Reaper 腐蚀泥；空中障碍：数码蝙蝠
 *   （低空要跳过，高空站着就能躲开，跳起来反而会撞上）
 * - 道具：数据芯片（加分）、蓝卡（Matrix Evolution 无敌）、火球（Bada Boom 自动炸掉前方障碍）
 * - 小丑兽偶尔飞过天空，丢下一张蓝卡
 *
 * 默认是自动驾驶的演示模式；按空格 / ↑ / 点击游戏区接管。
 * 素材由 Codex image_gen 二创生成，见 public/digimon/game。
 */

const ASSETS = {
  impmon: "/digimon/game/impmon-sheet.png",
  bug: "/digimon/game/bug.png",
  virus: "/digimon/game/virus.png",
  goo: "/digimon/game/goo.png",
  bat1: "/digimon/game/bat-1.png",
  bat2: "/digimon/game/bat-2.png",
  card: "/digimon/game/card-blue.png",
  chip: "/digimon/game/chip.png",
  fireball: "/digimon/game/fireball.png",
  calumon1: "/digimon/game/calumon-1.png",
  calumon2: "/digimon/game/calumon-2.png",
  farDay: "/digimon/game/bg-far-day.png",
  nearDay: "/digimon/game/bg-near-day.png",
  groundDay: "/digimon/game/ground-day.png",
  farNight: "/digimon/game/bg-far-night.png",
  nearNight: "/digimon/game/bg-near-night.png",
  groundNight: "/digimon/game/ground-night.png",
} as const;

type AssetKey = keyof typeof ASSETS;

/** 小妖兽精灵表：8 帧（0-5 跑步，6 跳跃，7 晕眩） */
const SHEET = { cellW: 43, cellH: 48, run: 6, jump: 6, hurt: 7 };

type Mode = "demo" | "play" | "over";
type Kind = "bug" | "virus" | "goo" | "bat-low" | "bat-high" | "chip" | "card" | "fireball";

interface Entity {
  kind: Kind;
  x: number;
  /** 离地高度（像素，向上为正） */
  alt: number;
  w: number;
  h: number;
  dead?: boolean;
  /** 下落中的蓝卡 */
  vy?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Palette {
  ink: string;
  accent: string;
  accent2: string;
  street: string;
  font: string;
}

function readPalette(element: HTMLElement): Palette {
  const style = getComputedStyle(element);
  const pick = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;

  return {
    ink: pick("--foreground-strong", "#11142f"),
    accent: pick("--accent", "#e8344b"),
    accent2: pick("--accent-2", "#0fa6d6"),
    street: pick("--background", "#f4f6fc"),
    font: pick("--font-pixelify", "monospace"),
  };
}

function readHighScore(): number {
  try {
    return Number(window.localStorage.getItem("impmon-runner-hi")) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    window.localStorage.setItem("impmon-runner-hi", String(score));
  } catch {
    // 隐私模式等场景下静默失败
  }
}

export function ImpmonRunner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const img = {} as Record<AssetKey, HTMLImageElement>;
    (Object.keys(ASSETS) as AssetKey[]).forEach((key) => {
      const image = new window.Image();
      image.src = ASSETS[key];
      img[key] = image;
    });
    const ready = (image: HTMLImageElement) => image.complete && image.naturalWidth > 0;

    let palette = readPalette(wrap);
    let dark = darkQuery.matches;
    let width = 0;
    let height = 0;
    let unit = 2;
    let feetY = 0;

    let mode: Mode = "demo";
    let visible = true;
    let frameId = 0;
    let last = 0;
    let overAt = 0;
    let shakeUntil = 0;

    let y = 0;
    let vy = 0;
    let speed = 0;
    let distance = 0;
    let chips = 0;
    let score = 0;
    let hiScore = readHighScore();
    let nextSpawn = 0;
    let invincibleUntil = 0;
    let fireCharges = 0;
    let bannerText = "";
    let bannerUntil = 0;
    let farX = 0;
    let nearX = 0;
    let groundX = 0;
    let entities: Entity[] = [];
    let particles: Particle[] = [];
    let projectile: { x: number; alt: number } | null = null;
    let calumon: { x: number; dropped: boolean } | null = null;
    let nextCalumon = 0;

    const playerX = () => Math.max(24, width * 0.08);
    const playerW = () => SHEET.cellW * unit;
    const playerH = () => SHEET.cellH * unit;
    const onGround = () => y >= 0;

    function size(key: AssetKey) {
      const image = img[key];
      return { w: (image.naturalWidth || 16) * unit, h: (image.naturalHeight || 16) * unit };
    }

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      unit = width < 640 ? 1.5 : 2;
      // 地面贴图上方约 1/4 是人行道，脚踩在人行道上
      feetY = height - 34 * unit + 9 * unit;
    }

    function reset(nextMode: Mode) {
      mode = nextMode;
      y = 0;
      vy = 0;
      speed = 190 * unit;
      distance = 0;
      chips = 0;
      score = 0;
      nextSpawn = 260 * unit;
      invincibleUntil = 0;
      fireCharges = 0;
      entities = [];
      particles = [];
      projectile = null;
      calumon = null;
      nextCalumon = performance.now() + 9000;
    }

    function jump() {
      if (!onGround()) return;
      vy = -430 * unit;
    }

    function banner(text: string, now: number) {
      bannerText = text;
      bannerUntil = now + 1400;
    }

    function burst(x: number, yy: number, colors: string[], count = 12) {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const power = (60 + Math.random() * 140) * unit;
        particles.push({
          x,
          y: yy,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power - 60 * unit,
          life: 0.5 + Math.random() * 0.4,
          color: colors[index % colors.length],
          size: unit * (1 + Math.round(Math.random() * 2)),
        });
      }
    }

    function addEntity(kind: Kind, x: number, alt = 0) {
      const key: AssetKey =
        kind === "bat-low" || kind === "bat-high"
          ? "bat1"
          : kind === "chip"
            ? "chip"
            : kind === "card"
              ? "card"
              : kind;
      const { w, h } = size(key);
      entities.push({ kind, x, alt, w, h });
    }

    function spawn() {
      const x = width + 30;
      const roll = Math.random();
      const hard = score > 250;

      if (roll < 0.18 && hard) {
        // 数码蝙蝠：低空要跳，高空要站着别动
        addEntity(Math.random() < 0.5 ? "bat-low" : "bat-high", x, 0);
        const bat = entities[entities.length - 1];
        bat.alt = bat.kind === "bat-low" ? 8 * unit : 54 * unit;
      } else {
        const kinds: Kind[] = ["bug", "bug", "virus", "goo"];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        addEntity(kind, x);
        if (kind === "bug" && Math.random() < 0.3) {
          addEntity("bug", x + size("bug").w * 1.05);
        }
      }

      // 数据芯片弧线
      if (Math.random() < 0.45) {
        const start = x + 150 * unit;
        const count = 3 + Math.floor(Math.random() * 3);
        const arc = Math.random() < 0.5;
        for (let index = 0; index < count; index += 1) {
          const t = count === 1 ? 0.5 : index / (count - 1);
          const alt = arc ? 18 * unit + Math.sin(t * Math.PI) * 40 * unit : 10 * unit;
          addEntity("chip", start + index * 16 * unit, alt);
        }
      }

      if (Math.random() < 0.07) addEntity("fireball", x + 110 * unit, 30 * unit);
      if (Math.random() < 0.03) addEntity("card", x + 90 * unit, 36 * unit);

      const gap = speed * (0.62 + Math.random() * 0.75) + 120 * unit;
      nextSpawn = distance + gap;
    }

    function rect(entity: Entity) {
      const inset = entity.kind === "goo" ? unit * 3 : unit * 2;
      return {
        x: entity.x + inset,
        y: feetY - entity.alt - entity.h + inset,
        w: entity.w - inset * 2,
        h: entity.h - inset,
      };
    }

    function playerRect() {
      const insetX = 10 * unit;
      return {
        x: playerX() + insetX,
        y: feetY + y - playerH() + 8 * unit,
        w: playerW() - insetX * 2,
        h: playerH() - 10 * unit,
      };
    }

    function overlap(a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    const isHazard = (kind: Kind) =>
      kind === "bug" || kind === "virus" || kind === "goo" || kind === "bat-low" || kind === "bat-high";

    function autopilot() {
      const px = playerX() + playerW();
      const lead = speed * 0.2 + 6 * unit;
      const ahead = entities.filter(
        (entity) => !entity.dead && isHazard(entity.kind) && entity.x + entity.w > playerX()
      );
      const next = ahead[0];
      if (!next) return;
      const gapToNext = next.x - px;
      const highBatNear = ahead.some(
        (entity) => entity.kind === "bat-high" && entity.x - px < speed * 0.75
      );
      if (next.kind !== "bat-high" && gapToNext < lead && !highBatNear) jump();
    }

    function update(dt: number, now: number) {
      if (mode === "over") {
        particles.forEach((particle) => {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vy += 900 * unit * dt;
          particle.life -= dt;
        });
        particles = particles.filter((particle) => particle.life > 0);
        if (now - overAt > 5000) {
          reset("demo");
          // 减少动态效果时，演示模式只保留一帧静止画面
          if (reduceMotion) stop();
        }
        return;
      }

      const boost = now < invincibleUntil ? 1.35 : 1;
      speed = Math.min(speed + dt * 5 * unit, 430 * unit);
      const step = speed * boost * dt;
      distance += step;
      score = Math.floor(distance / (10 * unit)) + chips * 5;

      farX -= step * 0.12;
      nearX -= step * 0.42;
      groundX -= step;

      // 物理
      const wasAir = !onGround();
      vy += 1350 * unit * dt;
      y = Math.min(0, y + vy * dt);
      if (y === 0) {
        vy = 0;
        if (wasAir) burst(playerX() + playerW() / 2, feetY, ["#c9c3d8", "#8e86a8"], 6);
      }

      if (distance >= nextSpawn) spawn();

      entities.forEach((entity) => {
        entity.x -= step;
        if (entity.vy !== undefined) {
          entity.vy += 900 * unit * dt;
          entity.alt = Math.max(36 * unit, entity.alt - entity.vy * dt);
        }
      });
      entities = entities.filter((entity) => entity.x + entity.w > -40 && !entity.dead);

      // 小丑兽飞过，丢下一张蓝卡
      if (!calumon && now > nextCalumon) {
        calumon = { x: width + 40, dropped: false };
      }
      if (calumon) {
        calumon.x -= (step * 0.35 + 90 * unit * dt);
        if (!calumon.dropped && calumon.x < width * 0.62) {
          calumon.dropped = true;
          addEntity("card", calumon.x, 120 * unit);
          entities[entities.length - 1].vy = 0;
        }
        if (calumon.x < -80) {
          calumon = null;
          nextCalumon = now + 18000 + Math.random() * 12000;
        }
      }

      // Bada Boom：有火球时自动打掉前方最近的障碍
      if (fireCharges > 0 && !projectile) {
        const target = entities.find(
          (entity) =>
            isHazard(entity.kind) &&
            entity.x > playerX() + playerW() &&
            entity.x < playerX() + playerW() + speed * 0.9
        );
        if (target) {
          fireCharges -= 1;
          projectile = { x: playerX() + playerW() * 0.7, alt: -y + playerH() * 0.55 };
          banner("BADA BOOM!", now);
        }
      }
      if (projectile) {
        projectile.x += (speed + 520 * unit) * dt;
        const pr = { x: projectile.x, y: feetY - projectile.alt - 6 * unit, w: 14 * unit, h: 12 * unit };
        const victim = entities.find((entity) => isHazard(entity.kind) && overlap(pr, rect(entity)));
        if (victim) {
          victim.dead = true;
          burst(victim.x + victim.w / 2, feetY - victim.alt - victim.h / 2, ["#ffd34d", "#ff7a1f", "#e8341f", "#fff"], 18);
          projectile = null;
        } else if (projectile.x > width + 20) {
          projectile = null;
        }
      }

      if (mode === "demo") autopilot();

      const me = playerRect();
      for (const entity of entities) {
        if (entity.dead || !overlap(me, rect(entity))) continue;

        if (entity.kind === "chip") {
          entity.dead = true;
          chips += 1;
          burst(entity.x + entity.w / 2, feetY - entity.alt - entity.h / 2, ["#ffd23f", "#fff3a8"], 6);
          continue;
        }
        if (entity.kind === "card") {
          entity.dead = true;
          invincibleUntil = now + 4000;
          banner("MATRIX EVOLUTION!", now);
          burst(entity.x, feetY - entity.alt, ["#2f6bff", "#9cc3ff", "#fff"], 16);
          continue;
        }
        if (entity.kind === "fireball") {
          entity.dead = true;
          fireCharges = Math.min(fireCharges + 1, 3);
          banner("FIRE CHARGED!", now);
          continue;
        }

        if (now < invincibleUntil) {
          entity.dead = true;
          burst(entity.x + entity.w / 2, feetY - entity.alt - entity.h / 2, ["#2f6bff", "#fff"], 10);
          continue;
        }
        if (mode === "demo") continue;

        mode = "over";
        overAt = now;
        shakeUntil = now + 300;
        burst(playerX() + playerW() / 2, feetY + y - playerH() / 2, [palette.accent, "#fff", "#ffd23f"], 20);
        if (score > hiScore) {
          hiScore = score;
          saveHighScore(score);
        }
        break;
      }

      particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 900 * unit * dt;
        particle.life -= dt;
      });
      particles = particles.filter((particle) => particle.life > 0);
    }

    function tile(image: HTMLImageElement, offset: number, bottom: number, alpha = 1) {
      if (!ready(image)) return;
      const w = image.naturalWidth * unit;
      const h = image.naturalHeight * unit;
      let x = ((offset % w) + w) % w - w;
      ctx!.globalAlpha = alpha;
      for (; x < width; x += w) {
        ctx!.drawImage(image, Math.round(x), Math.round(bottom - h), w, h);
      }
      ctx!.globalAlpha = 1;
    }

    function sprite(key: AssetKey, x: number, bottom: number) {
      const image = img[key];
      if (!ready(image)) return;
      const w = image.naturalWidth * unit;
      const h = image.naturalHeight * unit;
      ctx!.drawImage(image, Math.round(x), Math.round(bottom - h), w, h);
    }

    function label(text: string, x: number, yy: number, color: string) {
      ctx!.lineWidth = 4;
      ctx!.lineJoin = "round";
      ctx!.strokeStyle = palette.street;
      ctx!.strokeText(text, x, yy);
      ctx!.fillStyle = color;
      ctx!.fillText(text, x, yy);
    }

    function render(now: number) {
      ctx!.save();
      ctx!.clearRect(0, 0, width, height);
      if (now < shakeUntil) {
        ctx!.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
      }

      const groundTop = height - 34 * unit;
      tile(dark ? img.farNight : img.farDay, farX, groundTop - 10 * unit, dark ? 1 : 0.95);
      tile(dark ? img.nearNight : img.nearDay, nearX, groundTop + 2 * unit);
      tile(dark ? img.groundNight : img.groundDay, groundX, height);

      // 小丑兽
      if (calumon) {
        const flap = Math.floor(now / 160) % 2 === 0 ? "calumon1" : "calumon2";
        const bob = Math.sin(now / 220) * 6;
        sprite(flap, calumon.x, feetY - 128 * unit + bob);
      }

      // 道具与障碍
      for (const entity of entities) {
        if (entity.dead) continue;
        const bottom = feetY - entity.alt;
        switch (entity.kind) {
          case "bat-low":
          case "bat-high":
            sprite(Math.floor(now / 140) % 2 === 0 ? "bat1" : "bat2", entity.x, bottom);
            break;
          case "chip": {
            const squash = Math.abs(Math.cos(now / 160 + entity.x / 40));
            const image = img.chip;
            if (ready(image)) {
              const w = image.naturalWidth * unit;
              const h = image.naturalHeight * unit;
              const sw = Math.max(unit, w * squash);
              ctx!.drawImage(image, Math.round(entity.x + (w - sw) / 2), Math.round(bottom - h), sw, h);
            }
            break;
          }
          case "card":
            sprite("card", entity.x, bottom + Math.sin(now / 180) * 3 * unit);
            break;
          case "fireball":
            sprite("fireball", entity.x, bottom + Math.sin(now / 150) * 3 * unit);
            break;
          default:
            sprite(entity.kind, entity.x, bottom);
        }
      }

      // 投出去的火球
      if (projectile && ready(img.fireball)) {
        ctx!.save();
        ctx!.translate(projectile.x, feetY - projectile.alt);
        ctx!.rotate(now / 60);
        const w = img.fireball.naturalWidth * unit;
        const h = img.fireball.naturalHeight * unit;
        ctx!.drawImage(img.fireball, -w / 2, -h / 2, w, h);
        ctx!.restore();
      }

      // 小妖兽
      const invincible = now < invincibleUntil;
      let frame = 0;
      if (mode === "over") frame = SHEET.hurt;
      else if (!onGround()) frame = SHEET.jump;
      else frame = Math.floor(distance / (14 * unit)) % SHEET.run;
      if (ready(img.impmon)) {
        if (invincible) {
          ctx!.save();
          ctx!.shadowColor = "#2f6bff";
          ctx!.shadowBlur = 16 + Math.sin(now / 60) * 6;
        }
        if (fireCharges > 0 && !invincible) {
          ctx!.save();
          ctx!.shadowColor = "#ff7a1f";
          ctx!.shadowBlur = 10;
        }
        ctx!.drawImage(
          img.impmon,
          frame * SHEET.cellW,
          0,
          SHEET.cellW,
          SHEET.cellH,
          Math.round(playerX()),
          Math.round(feetY + y - playerH()),
          playerW(),
          playerH()
        );
        if (invincible || fireCharges > 0) ctx!.restore();
      }

      // 粒子
      for (const particle of particles) {
        ctx!.globalAlpha = Math.min(1, particle.life * 2);
        ctx!.fillStyle = particle.color;
        ctx!.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      }
      ctx!.globalAlpha = 1;

      // HUD
      const fontSize = width < 640 ? 11 : 13;
      ctx!.font = `${fontSize}px ${palette.font}`;
      ctx!.textBaseline = "top";
      ctx!.textAlign = "right";
      const hud =
        width < 560
          ? `HI ${String(hiScore).padStart(5, "0")} ${String(score).padStart(5, "0")}`
          : `◆${String(chips).padStart(2, "0")}   HI ${String(hiScore).padStart(5, "0")}  ${String(score).padStart(5, "0")}`;
      label(hud, width - 16, 12, palette.ink);
      if (fireCharges > 0) label(`FIRE ×${fireCharges}`, width - 16, 12 + fontSize + 8, "#ff7a1f");

      ctx!.textAlign = "left";
      if (mode === "demo") {
        ctx!.globalAlpha = 0.6 + Math.sin(now / 300) * 0.35;
        label(width < 560 ? "TAP TO PLAY" : "DEMO · PRESS SPACE / TAP TO PLAY", 16, 12, palette.ink);
        ctx!.globalAlpha = 1;
      }

      const bannerX = width / 2;
      ctx!.textAlign = "center";
      if (mode === "over") {
        ctx!.font = `${fontSize + 8}px ${palette.font}`;
        label("GAME OVER", bannerX, 40, palette.accent);
        ctx!.font = `${fontSize}px ${palette.font}`;
        label("SPACE / TAP TO RETRY", bannerX, 40 + fontSize + 16, palette.ink);
      } else if (now < bannerUntil) {
        const t = 1 - (bannerUntil - now) / 1400;
        ctx!.font = `${fontSize + 6}px ${palette.font}`;
        ctx!.globalAlpha = t < 0.8 ? 1 : (1 - t) * 5;
        label(bannerText, bannerX, 40 - Math.min(t, 0.2) * 20, bannerText.startsWith("MATRIX") ? "#2f6bff" : "#ff7a1f");
        ctx!.globalAlpha = 1;
      }

      ctx!.restore();
    }

    function loop(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      update(dt, now);
      render(now);
      if (!frameId) return;
      frameId = visible ? window.requestAnimationFrame(loop) : 0;
    }

    function start() {
      if (frameId || (reduceMotion && mode === "demo")) return;
      last = 0;
      frameId = window.requestAnimationFrame(loop);
    }

    function stop() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function act() {
      if (mode === "play") {
        jump();
        return;
      }
      reset("play");
      jump();
      start();
    }

    function onKey(event: KeyboardEvent) {
      if (!visible) return;
      if (event.key !== " " && event.key !== "ArrowUp") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]")) return;
      event.preventDefault();
      act();
    }

    function onPointer(event: PointerEvent) {
      event.preventDefault();
      act();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.3 }
    );

    const onScheme = () => {
      palette = readPalette(wrap);
      dark = darkQuery.matches;
    };

    // 改变画布尺寸会清空画面；没有动画循环时需要手动补画一帧
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!frameId) render(performance.now());
    });

    resize();
    reset("demo");
    // 减少动态效果时只画静止的一帧，等用户主动开始
    const paintStill = () => {
      if (reduceMotion && mode === "demo") render(performance.now());
    };
    Object.values(img).forEach((image) => image.addEventListener("load", paintStill));
    paintStill();

    resizeObserver.observe(wrap);
    observer.observe(wrap);
    darkQuery.addEventListener("change", onScheme);
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      darkQuery.removeEventListener("change", onScheme);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
      Object.values(img).forEach((image) => image.removeEventListener("load", paintStill));
    };
  }, []);

  return (
    <div ref={wrapRef} className="partner-runner">
      <canvas
        ref={canvasRef}
        className="partner-runner__canvas"
        aria-label="小妖兽跑酷小游戏：按空格或点击跳跃"
        role="img"
      />
    </div>
  );
}
