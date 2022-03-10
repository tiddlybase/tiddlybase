import type { CallableContext } from "firebase-functions/v1/https";

export type CallableFunctionType<T = any, R = any> = (request: T) => Promise<R>;

export type CallableFunctionHandler<T extends CallableFunctionType> = (data: Parameters<T>[0], context: CallableContext) => ReturnType<T>;

export type AddNumbers = CallableFunctionType<{
  firstNumber: number,
  secondNumber: number
}, {
  firstNumber: number,
  secondNumber: number,
  operator: string,
  operationResult: number,
}>

export type NotifyAdmin = CallableFunctionType<{
  subject: string,
  body: string
}, void>
