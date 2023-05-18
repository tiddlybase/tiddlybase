export const objFilter = <K extends keyof any = string, V = any>(fn: (k: K, v: V) => boolean, input: Record<K, V>): Record<K, V> =>
  Object.fromEntries(Object.entries(input).filter(([k, v]) => fn(k as K, v as V))) as Record<K, V>;
