export type Expression<Assertion> =
  | {and: Expression<Assertion>[]}
  | {or: Expression<Assertion>[]}
  | {not: Expression<Assertion>}
  | Assertion;

export type EvalAssertion<Assertion, Context> = (assertion:Assertion, context:Context)=>boolean;
export type EvalMaybeAssertion<Assertion, Context> = (assertion:Assertion, context:Context)=>boolean|undefined;

export const evalExpression = <Assertion, Context>(
  evalAssertion:EvalAssertion<Assertion, Context>,
  expression:Expression<Assertion>,
  context:Context):boolean => {
  if (typeof expression === 'object' && !!expression) {
    if ('and' in expression) {
      return expression.and.every(e => evalExpression(evalAssertion, e, context))
    }
    if ('or' in expression) {
      return expression.or.some(e => evalExpression(evalAssertion, e, context))
    }
    if ('not' in expression) {
      return !evalExpression(evalAssertion, expression.not, context);
    }
  }
  return evalAssertion(expression, context);
}
