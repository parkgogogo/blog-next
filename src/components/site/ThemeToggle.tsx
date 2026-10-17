"use client";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : systemTheme();
}

/**
 * 在亮暗之间切换。切回与系统一致的主题时清掉记录，重新跟随系统。
 * 图标显示由 CSS 按当前主题决定，组件本身不需要状态，也不会有水合不一致。
 */
export default function ThemeToggle() {
  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const followSystem = next === systemTheme();

    if (followSystem) delete root.dataset.theme;
    else root.dataset.theme = next;

    try {
      if (followSystem) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 隐私模式下 localStorage 不可用，只影响记忆，不影响本次切换
    }
  };

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Toggle color theme">
      <svg className="theme-toggle__moon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.5 9.6A5.5 5.5 0 0 1 6.4 2.5a5.5 5.5 0 1 0 7.1 7.1Z" />
      </svg>
      <svg className="theme-toggle__sun" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
      </svg>
    </button>
  );
}
