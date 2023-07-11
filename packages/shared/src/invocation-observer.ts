// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#object_internal_methods

import { FuncFields } from "./func-fields";

export type CallbackResult<T> = { result: T } | undefined;

export type InvocationObserver<T> = T & {
  subscribe: <K extends keyof FuncFields<T>>(method: K, handler: (...args: Parameters<FuncFields<T>[K]>) => CallbackResult<ReturnType<FuncFields<T>[K]>>) => void;
  unsubscribe: <K extends keyof FuncFields<T>>(method: K, handler: (...args: Parameters<FuncFields<T>[K]>) => CallbackResult<ReturnType<FuncFields<T>[K]>>) => void;
  invoke: <K extends keyof FuncFields<T>>(method: K, ...args: Parameters<FuncFields<T>[K]>) => CallbackResult<ReturnType<FuncFields<T>[K]>>;
}

export const makeInvocationObserver = <T extends object>({
  properties,
  defaultResponse = undefined
}: {
  properties?: Array<keyof T>,
  defaultResponse?: any
} = {}): InvocationObserver<T> => {
  const handlers: Partial<Record<keyof T, any[]>> = {};
  return new Proxy<InvocationObserver<T>>(
    {
      subscribe(method, handler) {
        if (!(method in handlers)) {
          handlers[method] = [];
        }
        handlers[method]?.push(handler)
      },
      unsubscribe(method, handler) {
        if (method in handlers) {
          handlers[method] = handlers[method]?.filter(h => h !== handler);
        }
      },
      invoke(method, ...args) {
        let result = undefined;
        for (let handler of handlers[method] ?? []) {
          const lastResult = handler(...args);
          if (result === undefined) {
            result = lastResult;
          }
        }
        return result;
      }
    } as InvocationObserver<T>, {
    ownKeys(_target: InvocationObserver<T>) {
      return (properties as Array<string | symbol> ?? []).slice();
    },
    getOwnPropertyDescriptor(_target, property) { // called for every property
      return {
        enumerable: true,
        configurable: true
      };
    },
    get(target: InvocationObserver<T>, property: string | symbol, _receiver: any) {
      // return subscribe, unsubscribe
      if (property in target) {
        return target[property as keyof typeof target];
      }
      if (this.has!(target, property)) {
        return (...args: Parameters<FuncFields<T>[keyof T]>) => {
          const result = target.invoke(property as keyof T, ...args);
          if (result && result.result) {
            return result.result;
          }
          return defaultResponse;
        };
      }
      return undefined;
    },
    has(target: InvocationObserver<T>, property: string | symbol) {
      return properties ? (this.ownKeys!(target) as Array<string | symbol>).indexOf(property) > -1 : true;
    }
  })
}
