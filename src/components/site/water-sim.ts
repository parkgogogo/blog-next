/**
 * 字符点阵背后的水面模拟：二维波动方程，每个点阵格子是水面上的一个点。
 *
 * - 微风：一张缓慢流动的"风压"噪声场推着水面，形成平缓、无规律的细浪
 * - 石子：在某一点按下一个形状不规则的坑，波纹从这里扩散
 * - 波纹和风浪相互作用，而不是简单叠加：
 *   1. 波速随风区变化（阵风吹过的水面波走得慢），波纹经过时会折射、扭曲
 *   2. 波速随风压起伏（风压高处走得快），风浪会把经过的波纹前沿推得参差不齐。
 *      不直接用水面高度调波速：那样波速会跟着波本身振荡，引起参量共振，数值上会发散
 *   3. 阻尼随风区变化，有的方向波纹散得快、有的方向传得远
 *   所以扩散出去的波纹不是正圆，而是随风变形的不规则环。
 *
 * 这个文件不依赖 DOM，可以单独在 Node 里跑来调参。
 */

export const waterTuning = {
  /** 风压推水面的力度 */
  windForce: 0.9,
  /** 风压对波速的调制程度 */
  pressureSpeedup: 1.4,
  /** 光照换算的增益：坡度 → 明暗 */
  lightGain: 5,
};

function hash2(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 2D value noise，[0, 1] */
export function noise2(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** 1D value noise，[-1, 1] */
function noise1(x: number) {
  return noise2(x, 0.5) * 2 - 1;
}

export class WaterSurface {
  readonly cols: number;
  readonly rows: number;
  h: Float32Array;
  private prev: Float32Array;
  private next: Float32Array;
  /** 上一次的风压，推力是它的时间差分 */
  private pressure: Float32Array;
  private primed = false;
  /** 每格的波速平方、阻尼，随风区缓慢变化 */
  private c2: Float32Array;
  private damp: Float32Array;
  /** 靠近画面边缘的格子吸收波，避免波纹撞到屏幕边缘反弹回来 */
  private sponge: Float32Array;
  /** 每格的明暗，-1 背光 … 1 迎光 */
  readonly light: Float32Array;
  /** 每格当前显示的字符序号 */
  readonly glyph: Uint8Array;
  private readonly glyphCount: number;
  private readonly seed: number;
  private stepCount = 0;

  constructor(cols: number, rows: number, seed: number, glyphCount: number) {
    this.cols = cols;
    this.rows = rows;
    this.seed = seed;
    this.glyphCount = glyphCount;
    const n = cols * rows;
    this.h = new Float32Array(n);
    this.prev = new Float32Array(n);
    this.next = new Float32Array(n);
    this.pressure = new Float32Array(n);
    this.c2 = new Float32Array(n);
    this.damp = new Float32Array(n);
    this.sponge = new Float32Array(n);
    this.light = new Float32Array(n);
    this.glyph = new Uint8Array(n);
    const band = 8;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x;
        const edge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
        this.sponge[i] = edge >= band ? 1 : 0.94 + 0.06 * (edge / band);
        this.glyph[i] = Math.floor(hash2(x * 7 + seed, y * 13) * glyphCount);
      }
    }
  }

  /** 风：阵风强度和风向 */
  wind(t: number) {
    const s = this.seed * 0.001;
    let gust = 0.5 + 0.5 * noise1(t * 0.05 + s * 7);
    gust = 0.35 + 0.65 * gust * gust;
    // 风向几十秒级别缓慢转动
    const angle = noise1(t * 0.012 + s * 13) * Math.PI * 1.2 + 0.4;
    return { gust, dx: Math.cos(angle), dy: Math.sin(angle) };
  }

  /** 按当前的风更新每格的波速和阻尼：阵风吹过的水面波走得慢、散得快 */
  updateMedium(t: number) {
    const { cols, rows } = this;
    const { dx, dy } = this.wind(t);
    const s = this.seed * 0.001;
    const ox = -t * dx * 0.25 + s * 31;
    const oy = -t * dy * 0.25 + s * 17;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x;
        const n = noise2(x * 0.045 + ox, y * 0.045 + oy) * 0.65 + noise2(x * 0.1 - oy, y * 0.1 + ox) * 0.35;
        this.c2[i] = 0.07 + 0.26 * n;
        this.damp[i] = 0.9975 - 0.005 * (1 - n);
      }
    }
  }

  /** 投下一颗石子：不规则形状的下压 */
  drop(cx: number, cy: number, strength = 1, random: () => number = Math.random) {
    const { cols, rows } = this;
    const radius = 2.2 + random() * 1.2;
    const phase = random() * 10;
    const r = Math.ceil(radius + 1);
    for (let y = Math.max(1, Math.floor(cy - r)); y <= Math.min(rows - 2, Math.ceil(cy + r)); y += 1) {
      for (let x = Math.max(1, Math.floor(cx - r)); x <= Math.min(cols - 2, Math.ceil(cx + r)); x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const angle = Math.atan2(dy, dx);
        // 半径随方向起伏，砸出的坑不是正圆
        const edge = radius * (0.8 + 0.4 * noise2(angle * 1.3 + phase, phase));
        const d = Math.hypot(dx, dy) / edge;
        if (d >= 1) continue;
        const k = Math.cos(d * Math.PI * 0.5);
        this.h[y * cols + x] -= strength * 1.6 * k * k;
      }
    }
  }

  /**
   * 视口尺寸变了：把旧水面上重叠的部分原样搬过来（格子都以左上角为原点，位置一一对应），
   * 正在扩散的波纹和风浪都接着走，不会因为窗口变化被清空。
   */
  copyFrom(other: WaterSurface) {
    const cols = Math.min(this.cols, other.cols);
    const rows = Math.min(this.rows, other.rows);
    for (let y = 0; y < rows; y += 1) {
      const a = y * this.cols;
      const b = y * other.cols;
      this.h.set(other.h.subarray(b, b + cols), a);
      this.prev.set(other.prev.subarray(b, b + cols), a);
      this.pressure.set(other.pressure.subarray(b, b + cols), a);
      this.glyph.set(other.glyph.subarray(b, b + cols), a);
    }
    // 新露出来的格子还没有风压记录，下一次只记录风压、不推水面，避免那一片被一下子抬起来
    this.primed = false;
    this.stepCount = other.stepCount;
  }

  step(t: number) {
    const { cols, rows, h, prev, next, c2, damp, pressure, sponge } = this;
    const { gust, dx, dy } = this.wind(t);
    const s = this.seed * 0.001;

    for (let y = 1; y < rows - 1; y += 1) {
      let i = y * cols + 1;
      for (let x = 1; x < cols - 1; x += 1, i += 1) {
        const hi = h[i];
        const lap = h[i - 1] + h[i + 1] + h[i - cols] + h[i + cols] - 4 * hi;
        let speed = c2[i] * (1 + waterTuning.pressureSpeedup * (pressure[i] - 0.5));
        if (speed > 0.42) speed = 0.42;
        next[i] = (hi + (hi - prev[i]) * damp[i] + speed * lap) * sponge[i];
      }
    }

    // 风压场顺着风向流动；推力取风压的时间变化，平均为零，水面不会被越推越高。
    // 隔一步算一次（两步合用一次差分），省一半噪声计算
    if ((this.stepCount & 1) === 0) {
      // 风压条纹横在风向上（顺风方向变化快、横风方向变化慢），推出来的浪峰也横着排开
      const drift = t * 0.6;
      const force = waterTuning.windForce * gust;
      for (let y = 1; y < rows - 1; y += 1) {
        let i = y * cols + 1;
        for (let x = 1; x < cols - 1; x += 1, i += 1) {
          const along = x * dx + y * dy;
          const across = y * dx - x * dy;
          const p =
            noise2(along * 0.11 - drift + s * 3, across * 0.035 + s * 5) * 0.65 +
            noise2(along * 0.19 - drift * 1.6 + s * 11, across * 0.07 + drift * 0.3) * 0.35;
          if (this.primed) next[i] += (p - pressure[i]) * force;
          pressure[i] = p;
        }
      }
      this.primed = true;
    }

    // 边界是自由的（取相邻格的值），不会在屏幕边缘形成一道坡
    for (let x = 0; x < cols; x += 1) {
      next[x] = next[x + cols];
      next[(rows - 1) * cols + x] = next[(rows - 2) * cols + x];
    }
    for (let y = 0; y < rows; y += 1) {
      next[y * cols] = next[y * cols + 1];
      next[y * cols + cols - 1] = next[y * cols + cols - 2];
    }

    // 石子是往下压的，水位会慢慢偏低；隔几步把平均水位拉回零
    if (this.stepCount % 8 === 0) {
      let sum = 0;
      for (let i = 0; i < next.length; i += 1) sum += next[i];
      const mean = sum / next.length;
      if (Math.abs(mean) > 1e-6) {
        for (let i = 0; i < next.length; i += 1) {
          next[i] -= mean;
          h[i] -= mean;
        }
      }
    }

    this.prev = h;
    this.h = next;
    this.next = prev;
    this.stepCount += 1;
  }

  /** 算每格的明暗（光从左上方来：迎光的坡面亮、背光的坡面暗），并让水动的地方字符翻动 */
  shade(random: () => number = Math.random) {
    const { cols, rows, h, prev, glyph, light, glyphCount } = this;
    for (let y = 0; y < rows; y += 1) {
      const up = y > 0 ? -cols : 0;
      const down = y < rows - 1 ? cols : 0;
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x;
        const left = x > 0 ? -1 : 0;
        const right = x < cols - 1 ? 1 : 0;
        const slope = (h[i + left] - h[i + right]) * 0.55 + (h[i + up] - h[i + down]) * 0.45;
        light[i] = Math.tanh(slope * waterTuning.lightGain);
        const motion = Math.abs(h[i] - prev[i]);
        if (random() < motion * 1.5 + 0.0012) glyph[i] = Math.floor(random() * glyphCount);
      }
    }
  }
}
