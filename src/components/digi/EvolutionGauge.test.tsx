import type { EffectCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  progress: 0,
  effect: undefined as EffectCallback | undefined,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [
    hooks.progress,
    (value: number) => {
      hooks.progress = value;
    },
  ],
  useEffect: (effect: EffectCallback) => {
    hooks.effect = effect;
  },
}));

import { EvolutionGauge } from "./EvolutionGauge";

describe("EvolutionGauge scroll boundaries", () => {
  beforeEach(() => {
    hooks.progress = 0;
    hooks.effect = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [-80, 1800, 0, "rookie"],
    [-0.5, 1800, 0, "rookie"],
    [0, 1800, 0, "rookie"],
    [250, 1800, 25, "champion"],
    [500, 1800, 50, "ultimate"],
    [750, 1800, 75, "mega"],
    [1000, 1800, 100, "mega"],
    [1100, 1800, 100, "mega"],
  ])(
    "renders safely at scrollY=%s and scrollHeight=%s",
    (scrollY, scrollHeight, percent, stage) => {
      const listeners = new Map<string, () => void>();
      let frame: (() => void) | undefined;
      vi.stubGlobal("document", { documentElement: { scrollHeight } });
      vi.stubGlobal("window", {
        scrollY: 0,
        innerHeight: 800,
        addEventListener: (event: string, listener: () => void) => {
          listeners.set(event, listener);
        },
        removeEventListener: vi.fn(),
        requestAnimationFrame: (callback: () => void) => {
          frame = callback;
          return 1;
        },
        cancelAnimationFrame: vi.fn(),
      });

      renderToStaticMarkup(<EvolutionGauge />);
      const cleanup = hooks.effect?.();
      window.scrollY = scrollY;
      listeners.get("scroll")?.();
      expect(frame).toBeDefined();
      frame?.();

      const html = renderToStaticMarkup(<EvolutionGauge />);
      expect(html).toContain(`data-stage="${stage}"`);
      expect(html).toContain(`aria-valuenow="${percent}"`);
      expect(html.match(/class="is-on"/g) ?? []).toHaveLength(
        Math.round((percent / 100) * 24),
      );
      if (typeof cleanup === "function") cleanup();
    },
  );

  it.each([
    [-80, 800],
    [0, 600],
  ])(
    "hides the gauge when the page cannot scroll (scrollY=%s, scrollHeight=%s)",
    (scrollY, scrollHeight) => {
      const listeners = new Map<string, () => void>();
      let frame: (() => void) | undefined;
      vi.stubGlobal("document", { documentElement: { scrollHeight } });
      vi.stubGlobal("window", {
        scrollY: 0,
        innerHeight: 800,
        addEventListener: (event: string, listener: () => void) => {
          listeners.set(event, listener);
        },
        removeEventListener: vi.fn(),
        requestAnimationFrame: (callback: () => void) => {
          frame = callback;
          return 1;
        },
        cancelAnimationFrame: vi.fn(),
      });

      renderToStaticMarkup(<EvolutionGauge />);
      const cleanup = hooks.effect?.();
      window.scrollY = scrollY;
      listeners.get("scroll")?.();
      frame?.();

      expect(renderToStaticMarkup(<EvolutionGauge />)).toBe("");
      if (typeof cleanup === "function") cleanup();
    },
  );
});
