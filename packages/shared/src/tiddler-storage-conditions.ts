import { EvalAssertion, Expression, evalExpression } from "./expressions";
import type { LaunchParameters, TiddlerStorageUseCondition, LaunchParametersConditionAssertion, TiddlerStorageWriteCondition, TiddlerConditionAssertion } from "./tiddlybase-config-schema";

const KNOWN_PRIVATE = new Set<string>(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'])
const PRIVATE_PREFIX = '€:/'
export const ALWAYS_TRUE_CONDITION: Expression<TiddlerConditionAssertion> = true;
export type WriteConditionEvaluationContext = {
  tiddler: $tw.TiddlerFields;
  launchParameters: LaunchParameters;
}
export const _evalWriteCondition: EvalAssertion<TiddlerConditionAssertion, WriteConditionEvaluationContext> = (assertion, context) => {
  if (typeof assertion === 'boolean') {
    return assertion;
  }
  if (typeof assertion === 'object') {
    if ('titlePrefix' in assertion) {
      const expectedPrefix = evaluateMustacheTemplate(
        assertion.titlePrefix,
        context
      )
      return context.tiddler.title.startsWith();
    }
  }
  if (assertion === 'private') {
    return KNOWN_PRIVATE.has(context.tiddler.title) || context.tiddler.title.startsWith(PRIVATE_PREFIX) || ('draft.of' in context.tiddler)
  }
  if (assertion === 'authenticated') {
    return !!context.launchParameters.userId;
  }
  throw new Error(`unhandled write condition assertion: ${JSON.stringify(assertion)}`);
}

export const getWriteConditionEvaluator = (writeCondition?: TiddlerStorageWriteCondition) => {
  return (tiddler: $tw.TiddlerFields, launchParameters: LaunchParameters) => evalExpression(
    _evalWriteCondition,
    writeCondition ?? ALWAYS_TRUE_CONDITION,
    {tiddler, launchParameters})
};

export const _evalUseCondition: EvalAssertion<LaunchParametersConditionAssertion, LaunchParameters> = (assertion, launchParameters) => {
  if (typeof assertion === 'boolean') {
    return assertion;
  }
  if (assertion === 'authenticated') {
    return !!launchParameters.userId;
  }
  throw new Error(`unhandled use condition assertion: ${JSON.stringify(assertion)}`);
}

export const evaluateTiddlerStorageUseCondition = (
  useCondition: TiddlerStorageUseCondition | undefined,
  launchParameters: LaunchParameters) => evalExpression(
    _evalUseCondition,
    useCondition ?? ALWAYS_TRUE_CONDITION,
    launchParameters);
