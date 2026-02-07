type AudioEntryState = "idle" | "loading" | "ready" | "error";

type AudioEntry = {
  src: string;
  state: AudioEntryState;
  objectUrl?: string;
  error?: Error;
  promise?: Promise<void>;
  resolve?: () => void;
  reject?: (error: Error) => void;
  controller?: AbortController;
};

interface MemoryAudioPreloaderOptions {
  concurrency?: number;
  onReady?: (src: string) => void;
}

export class MemoryAudioPreloader {
  private readonly entries = new Map<string, AudioEntry>();
  private readonly queue: string[] = [];
  private readonly concurrency: number;
  private readonly onReady?: (src: string) => void;
  private activeCount = 0;

  constructor(options?: MemoryAudioPreloaderOptions) {
    this.concurrency = Math.max(1, options?.concurrency ?? 3);
    this.onReady = options?.onReady;
  }

  register(src?: string) {
    if (!src || this.entries.has(src)) return;
    this.entries.set(src, { src, state: "idle" });
  }

  registerMany(srcList: Array<string | undefined>) {
    srcList.forEach((src) => this.register(src));
  }

  preload(src: string) {
    this.register(src);
    const entry = this.entries.get(src);
    if (!entry) return Promise.resolve();
    if (entry.state === "ready") return Promise.resolve();
    if (entry.state === "loading" && entry.promise) return entry.promise;

    entry.state = "loading";
    entry.error = undefined;
    entry.promise = new Promise<void>((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
    });
    this.queue.push(src);
    this.schedule();
    return entry.promise;
  }

  preloadMany(srcList: Array<string | undefined>) {
    const tasks = srcList
      .filter((src): src is string => Boolean(src))
      .map((src) => this.preload(src));
    return Promise.allSettled(tasks);
  }

  async resolveForPlayback(src?: string) {
    if (!src) return undefined;
    this.register(src);
    const entry = this.entries.get(src);
    if (!entry) return src;

    if (entry.state === "idle" || entry.state === "error") {
      await this.preload(src).catch(() => undefined);
    } else if (entry.state === "loading") {
      await entry.promise?.catch(() => undefined);
    }

    return this.getPlayableSrc(src);
  }

  getLoadedSrc(src?: string) {
    if (!src) return undefined;
    return this.entries.get(src)?.objectUrl;
  }

  getPlayableSrc(src?: string) {
    if (!src) return undefined;
    return this.getLoadedSrc(src) ?? src;
  }

  dispose() {
    this.queue.length = 0;
    this.entries.forEach((entry) => {
      if (entry.controller) {
        entry.controller.abort();
      }
      if (entry.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    });
    this.entries.clear();
  }

  private schedule() {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const src = this.queue.shift();
      if (!src) continue;
      const entry = this.entries.get(src);
      if (!entry || entry.state !== "loading") continue;
      this.activeCount += 1;
      void this.fetchEntry(entry).finally(() => {
        this.activeCount -= 1;
        this.schedule();
      });
    }
  }

  private async fetchEntry(entry: AudioEntry) {
    const controller = new AbortController();
    entry.controller = controller;
    try {
      const response = await fetch(entry.src, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`audio preload failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const nextObjectUrl = URL.createObjectURL(blob);
      if (entry.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
      entry.objectUrl = nextObjectUrl;
      entry.state = "ready";
      entry.error = undefined;
      entry.resolve?.();
      this.onReady?.(entry.src);
    } catch (error) {
      entry.state = "error";
      entry.error = error instanceof Error ? error : new Error("audio preload failed");
      entry.reject?.(entry.error);
    } finally {
      entry.promise = undefined;
      entry.resolve = undefined;
      entry.reject = undefined;
      entry.controller = undefined;
    }
  }
}
