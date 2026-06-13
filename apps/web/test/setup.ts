// jsdom under vitest + Node 22+ does not expose a working `localStorage`:
// Node ships an experimental global `localStorage` that is `undefined` unless
// `--localstorage-file` is set, and vitest's jsdom window has no storage either.
// Install a spec-compliant in-memory Storage shim so store/theme tests that
// read and persist settings work.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function install(name: "localStorage" | "sessionStorage"): void {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
  }
}

install("localStorage");
install("sessionStorage");
