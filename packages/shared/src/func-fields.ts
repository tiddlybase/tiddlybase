export type AnyFunction = (...args: any[]) => any;

// Only preserves fields of an interface which have function type
export type FuncFields<T> = {
  [P in keyof T]: T[P] extends AnyFunction ? T[P] : never;
};
