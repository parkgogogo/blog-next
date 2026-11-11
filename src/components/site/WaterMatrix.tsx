"use client";

import { useEffect, useRef } from "react";
import { WaterSurface } from "./water-sim";

/**
 * 字符点阵水面背景
 *
 * 整个页面铺一层字符点阵，点阵就是一片水面：每个格子是水面上的一个点，
 * 格子里字符的浓淡由这一点的水面明暗（迎光面浓、背光面淡）决定，水动的地方字符会翻动。
 * 微风吹出平缓的细浪；点击页面就像投下一颗石子，波纹扩散出去，并被风浪扭曲成不规则的环。
 * 水面模拟见 ./water-sim.ts。
 *
 * 渲染：模拟结果每帧写进一张"每格一像素"的纹理（明暗 + 字符序号），
 * WebGL2 全屏片元着色器按像素找到所在格子，从字形图集里取字符画出来。
 *
 * 性能：模拟网格约 144×90（1440px 宽时），每帧两步，CPU 上约 1ms；
 * 30fps、DPR 上限 2、页面隐藏时停止；prefers-reduced-motion 只画一帧静止水面；
 * 不支持 WebGL2 时什么都不画。
 */

const FRAME_INTERVAL = 1000 / 30;
/** 点阵格子边长（CSS px） */
const CELL = 10;
/** 每帧模拟步数 */
const STEPS_PER_FRAME = 2;

/** 半角片假名 + 数字；不用 . : | 这类笔画太少的符号 */
const GLYPHS = Array.from("ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789");
const ATLAS_COLS = 8;

/** 正文栏的中线与半宽（含一点呼吸空间），和 globals.css 里的 --content 对应 */
function readingColumn(width: number) {
  const gutter = width >= 768 ? 32 : 24;
  return { center: width / 2, half: Math.min(338, width / 2 - gutter) + 28 };
}

const VERTEX_SHADER = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D u_field;  // 每格一像素：R = 明暗，G = 字符序号
uniform sampler2D u_atlas;  // 字形图集
uniform vec2 u_grid;        // 列数、行数
uniform float u_cell;       // 格子边长（CSS px）
uniform float u_dpr;
uniform float u_height;     // 画布高度（设备像素）
uniform vec2 u_atlasGrid;
uniform vec3 u_color;
uniform vec2 u_alpha;       // 平静水面的浓度、波光的浓度
uniform vec3 u_column;      // 正文栏中线、半宽、栏内保留的浓度

out vec4 outColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, u_height - gl_FragCoord.y) / u_dpr;
  vec2 cell = floor(css / u_cell);
  vec2 local = css / u_cell - cell;

  vec4 field = texelFetch(u_field, ivec2(min(cell, u_grid - 1.0)), 0);
  float light = field.r * 2.0 - 1.0;  // -1 背光 … 1 迎光
  float idx = floor(field.g * 255.0 + 0.5);
  vec2 glyph = vec2(mod(idx, u_atlasGrid.x), floor(idx / u_atlasGrid.x));
  float ink = texture(u_atlas, (glyph + local) / u_atlasGrid).a;

  // 平静水面是一层很淡的底纹，随细浪轻轻起伏；波纹的迎光面亮成一道道环
  float base = u_alpha.x * (0.6 + 0.4 * hash(cell)) * clamp(1.0 + 1.1 * light, 0.15, 2.0);
  // 迎光面最亮，背光面也闪一点，波纹的环才连贯
  float glint = smoothstep(0.25, 0.95, abs(light)) * (light > 0.0 ? 1.0 : 0.55);
  float a = base + u_alpha.y * floor(glint * 4.0 + 0.5) / 4.0;

  // 正文栏里压淡，不影响阅读
  float dx = abs((cell.x + 0.5) * u_cell - u_column.x);
  float outside = smoothstep(u_column.y, u_column.y + 48.0, dx);
  a *= mix(u_column.z, 1.0, outside);

  a *= ink;
  outColor = vec4(u_color * a, a);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[WaterMatrix]", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[WaterMatrix]", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** 字形图集：每个字形占一个格子（设备像素），白字透明底 */
function drawAtlas(dpr: number, fontFamily: string) {
  const size = Math.round(CELL * dpr);
  const rows = Math.ceil(GLYPHS.length / ATLAS_COLS);
  const canvas = document.createElement("canvas");
  canvas.width = size * ATLAS_COLS;
  canvas.height = size * rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.82)}px ${fontFamily}`;
  GLYPHS.forEach((char, i) => {
    const x = (i % ATLAS_COLS) * size + size / 2;
    const y = Math.floor(i / ATLAS_COLS) * size + size / 2;
    ctx.fillText(char, x, y);
  });
  return { canvas, rows };
}

function parseColor(value: string): [number, number, number] {
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return [0, 0, 0];
  probe.fillStyle = value.trim() || "#000";
  const normalized = probe.fillStyle;
  if (normalized.startsWith("#")) {
    const n = Number.parseInt(normalized.slice(1, 7), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const parts = normalized.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
}

export default function WaterMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) return;
    const program = createProgram(gl);
    if (!program) return;

    let disposed = false;
    let raf = 0;
    let lastFrame = -Infinity;
    let atlasDpr = 0;
    let header: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
    let water: WaterSurface | null = null;
    let pixels = new Uint8Array(0);
    let frame = 0;

    const seed = Math.floor(Math.random() * 100000);
    const timeOffset = Math.random() * 600;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uniforms = {
      field: u("u_field"),
      atlas: u("u_atlas"),
      grid: u("u_grid"),
      cell: u("u_cell"),
      dpr: u("u_dpr"),
      height: u("u_height"),
      atlasGrid: u("u_atlasGrid"),
      color: u("u_color"),
      alpha: u("u_alpha"),
      column: u("u_column"),
    };

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const makeTexture = (filter: number) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    const fieldTexture = makeTexture(gl.NEAREST);
    const atlasTexture = makeTexture(gl.LINEAR);

    gl.useProgram(program);
    gl.uniform1i(uniforms.field, 0);
    gl.uniform1i(uniforms.atlas, 1);
    gl.uniform1f(uniforms.cell, CELL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    const uploadAtlas = (dpr: number) => {
      const fontFamily =
        getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
      const atlas = drawAtlas(dpr, fontFamily);
      if (!atlas) return;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.useProgram(program);
      gl.uniform2f(uniforms.atlasGrid, ATLAS_COLS, atlas.rows);
      atlasDpr = dpr;
    };

    // 主题既可能跟随系统，也可能由页头开关写进 <html data-theme>，直接读当前生效的颜色
    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      const ink = parseColor(styles.getPropertyValue("--fg") || "#000");
      const [r, g, b] = parseColor(styles.getPropertyValue("--bg") || "#fff");
      const isDark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
      gl.useProgram(program);
      gl.uniform3fv(uniforms.color, ink);
      gl.uniform2f(uniforms.alpha, isDark ? 0.075 : 0.08, isDark ? 0.36 : 0.4);
    };

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      if (!water || water.cols !== cols || water.rows !== rows) {
        const next = new WaterSurface(cols, rows, seed, GLYPHS.length);
        const t = performance.now() / 1000 + timeOffset;
        if (water) {
          // 窗口变了：旧水面上的波纹和风浪原样搬过来，接着走
          next.copyFrom(water);
          next.updateMedium(t);
        } else {
          // 第一次：先让风把水面吹 4 秒，打开页面时就是有细浪的样子
          next.updateMedium(t - 4);
          for (let k = 0; k < 240; k += 1) next.step(t - 4 + k / 60);
        }
        water = next;
        pixels = new Uint8Array(cols * rows * 4);
      }
      if (dpr !== atlasDpr) uploadAtlas(dpr);

      // 页头有不透明的底色（挡住滚上去的正文），在页头里放一条画布，把水面最上面一条照搬过去
      const headerCanvas = document.querySelector<HTMLCanvasElement>(".site-header__water");
      const headerCtx = headerCanvas?.getContext("2d");
      if (headerCanvas && headerCtx) {
        headerCanvas.width = canvas.width;
        headerCanvas.height = Math.round(headerCanvas.clientHeight * dpr);
        headerCanvas.dataset.ready = "true";
        header = { canvas: headerCanvas, ctx: headerCtx };
      } else {
        header = null;
      }

      gl.useProgram(program);
      gl.uniform2f(uniforms.grid, cols, rows);
      gl.uniform1f(uniforms.dpr, dpr);
      gl.uniform1f(uniforms.height, canvas.height);
      const column = readingColumn(width);
      gl.uniform3f(uniforms.column, column.center, column.half, width < 900 ? 0.25 : 0.3);
      applyTheme();
    };

    const draw = (now: number, simulate: boolean) => {
      if (!water) return;
      const t = now / 1000 + timeOffset;
      if (simulate) {
        if (frame % 8 === 0) water.updateMedium(t);
        for (let k = 0; k < STEPS_PER_FRAME; k += 1) water.step(t + k / 60);
        frame += 1;
      }
      water.shade();
      const { light, glyph } = water;
      for (let i = 0; i < light.length; i += 1) {
        pixels[i * 4] = Math.round(127.5 + 127.5 * light[i]);
        pixels[i * 4 + 1] = glyph[i];
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, water.cols, water.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);

      if (header && header.canvas.height > 0) {
        const { canvas: target, ctx } = header;
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(canvas, 0, 0, target.width, target.height, 0, 0, target.width, target.height);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < FRAME_INTERVAL - 2) return;
      lastFrame = now;
      draw(now, true);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (disposed || document.hidden) return;
      if (reducedMotion.matches) {
        draw(performance.now(), false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    // 尺寸一变就立刻跟上（不做防抖），否则防抖期间画布会被拉伸变形
    const onResize = () => {
      resize();
      draw(performance.now(), false);
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };

    const onThemeChange = () => {
      applyTheme();
      if (reducedMotion.matches) draw(performance.now(), false);
    };

    // 点击 = 投下一颗石子；画布本身不接收事件，监听整个窗口
    const onPointerDown = (event: PointerEvent) => {
      if (!water || reducedMotion.matches || event.button !== 0) return;
      water.drop(event.clientX / CELL, event.clientY / CELL, event.pointerType === "touch" ? 1.1 : 1.3);
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      disposed = true;
      canvas.dataset.ready = "false";
    };

    resize();
    start();
    canvas.dataset.ready = "true";

    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    darkScheme.addEventListener("change", onThemeChange);
    reducedMotion.addEventListener("change", start);
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
      darkScheme.removeEventListener("change", onThemeChange);
      reducedMotion.removeEventListener("change", start);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteTexture(fieldTexture);
      gl.deleteTexture(atlasTexture);
      gl.deleteBuffer(quad);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="water-matrix" aria-hidden="true" />;
}
