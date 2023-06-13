export type Lazy<T> = () => T;

export const lazy = <T>(provider: () => T): Lazy<T> => {
  let evaluated = false;
  let value: T | undefined = undefined;
  return () => {
    if (!evaluated) {
      value = provider();
      evaluated = true;
    }
    return value!;
  }
};
