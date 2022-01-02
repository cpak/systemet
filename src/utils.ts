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
