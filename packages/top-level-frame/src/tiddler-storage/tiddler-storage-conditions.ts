import { EvalAssertion, EvalMaybeAssertion, Expression, evalExpression } from "@tiddlybase/shared/src/expressions";
import type {
  LaunchParameters,
  TiddlerStorageUseCondition,
  LaunchParametersConditionAssertion,
  TiddlerStorageWriteCondition,
  TiddlerConditionAssertion,
  CommonConditionAssertion,
  PinTiddlerToStorageCondition
 } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { evaluateMustacheTemplate } from "./tiddler-storage-utils";

const KNOWN_PRIVATE = new Set<string>(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'])
const PRIVATE_PREFIX = '€:/'
export const ALWAYS_TRUE_CONDITION: Expression<TiddlerConditionAssertion> = true;
export const ALWAYS_FALSE_CONDITION: Expression<TiddlerConditionAssertion> = false;
export type TiddlerConditionEvaluationContext = {
  tiddler: $tw.TiddlerFields;
  launchParameters: LaunchParameters;
}
export type CommonAssertionEvaluationContext = {
  launchParameters: LaunchParameters;
}
const prepareWriteAssertionContext = (context:TiddlerConditionEvaluationContext) => ({...context.launchParameters, tiddler: context.tiddler})

export const _evalCommonAssert: EvalMaybeAssertion<CommonConditionAssertion, CommonAssertionEvaluationContext> = (assertion, context) => {
  if (typeof assertion === 'boolean') {
    return assertion;
  }
  if (assertion === 'authenticated') {
    return !!context.launchParameters.userId;
  }
  return undefined
}

export const _evalTiddlerConditionAssertion: EvalAssertion<TiddlerConditionAssertion, TiddlerConditionEvaluationContext> = (assertion, context) => {
  if (typeof assertion === 'object') {
    if ('titlePrefix' in assertion) {
      const expectedPrefix = evaluateMustacheTemplate(
        assertion.titlePrefix,
        prepareWriteAssertionContext(context)
      )
      return context.tiddler.title.startsWith(expectedPrefix);
    }
  }
  if (assertion === 'private') {
    return KNOWN_PRIVATE.has(context.tiddler.title) || context.tiddler.title.startsWith(PRIVATE_PREFIX) || ('draft.of' in context.tiddler)
  }
  const evaluationResult = _evalCommonAssert(assertion, {launchParameters: context.launchParameters})
  if (evaluationResult === undefined) {
    throw new Error(`unhandled write condition assertion: ${JSON.stringify(assertion)}`);
  }
  return evaluationResult
}

export const getWriteConditionEvaluator = (writeCondition?: TiddlerStorageWriteCondition) => {
  return (tiddler: $tw.TiddlerFields, launchParameters: LaunchParameters) => evalExpression(
    _evalTiddlerConditionAssertion,
    writeCondition ?? ALWAYS_TRUE_CONDITION,
    {tiddler, launchParameters})
};

export const getPinTiddlerConditionEvaluator = (pinCondition?: PinTiddlerToStorageCondition) => {
  return (tiddler: $tw.TiddlerFields, launchParameters: LaunchParameters) => evalExpression(
    _evalTiddlerConditionAssertion,
    pinCondition ?? ALWAYS_FALSE_CONDITION,
    {tiddler, launchParameters})
};

export const _evalLaunchParameterAssertion: EvalAssertion<LaunchParametersConditionAssertion, LaunchParameters> = (assertion, launchParameters) => {
  const evaluationResult = _evalCommonAssert(assertion, {launchParameters})
  if (evaluationResult === undefined) {
    throw new Error(`unhandled use condition assertion: ${JSON.stringify(assertion)}`);
  }
  return evaluationResult
}

export const evaluateTiddlerStorageUseCondition = (
  useCondition: TiddlerStorageUseCondition | undefined,
  launchParameters: LaunchParameters) => evalExpression(
    _evalLaunchParameterAssertion,
    useCondition ?? ALWAYS_TRUE_CONDITION,
    launchParameters);
