export const objFilter = <K extends keyof any = string, V = any>(fn: (k: K, v: V) => boolean, input: Partial<Record<K, V>>) =>
  Object.fromEntries(Object.entries(input).filter(([k, v]) => fn(k as K, v as V))) as Partial<Record<K, V>>;

export const asList = (x: any) => Array.isArray(x) ? x : [x];
