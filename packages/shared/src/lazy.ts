export type Lazy<T> = () => T;

export const lazy = <T>(provider: () => T): Lazy<T> => {
  let evaluated = false;
  let value: T | undefined = undefined;
  return () => {
    if (!evaluated) {
      // if provider() throws an exception then the evaluation will be attempted
      // again on the next invocation of lazy()
      value = provider();
      evaluated = true;
    }
    return value!;
  }
};
