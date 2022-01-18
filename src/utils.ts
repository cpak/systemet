const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
interface CacheItem<T> {
  data: T | null;
  date: number;
}

async function cacheSet<T>(key: string, data: T): Promise<T> {
  await chrome.storage.local.set({ [key]: { data, date: Date.now() } });
  return data;
}

async function cacheGet<T>(key: string) {
  const cached: { [key: string]: CacheItem<T> } =
    await chrome.storage.local.get(key);
  if (cached && cached[key] && cached[key].date < Date.now() + CACHE_TTL_MS) {
    return cached[key].data;
  }
  return null;
}

export function cached<T>(fn: (arg: string) => Promise<T>): (arg: string) => Promise<T> {
  return async (arg: string) => {
    const cached = await cacheGet<T>(arg);
    if (cached) return cached;
    return fn(arg).then((res: T) => cacheSet<T>(arg, res));
  };
}

export async function serial<T, U>(
  fn: (arg0: T) => Promise<U>,
  xs: T[]
): Promise<U[]> {
  let i = 0;
  const res: U[] = [];
  const next = async () => {
    if (i < xs.length) {
      res.push(await fn(xs[i++]));
      await next();
    }
  };
  await next();
  return Promise.resolve(res);
}

export function notNull<TValue>(
  value: TValue | null | undefined
): value is TValue {
  if (value === null || value === undefined) return false;
  const ignored: TValue = value;
  return true;
}

export function identity<T>(x: T): T {
  return x;
}

export function delay(n: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, n);
  });
}

export function debounce(fn: CallableFunction, delayMs: number): () => void {
  let t: number;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, delayMs);
  };
}
