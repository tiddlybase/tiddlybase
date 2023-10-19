import { EvalAssertion, Expression, evalExpression } from "./expressions";
import type { LaunchParameters, TiddlerStorageUseCondition, TiddlerStorageUseConditionAssertion, TiddlerStorageWriteCondition, TiddlerStorageWriteConditionAssertion } from "./tiddlybase-config-schema";

const KNOWN_PRIVATE = new Set<string>(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'])
const PRIVATE_PREFIX = '€:/'
export const ALWAYS_TRUE_CONDITION: Expression<TiddlerStorageWriteConditionAssertion> = true;

export const _evalWriteCondition: EvalAssertion<TiddlerStorageWriteConditionAssertion, $tw.TiddlerFields> = (assertion, tiddler) => {
  if (typeof assertion === 'boolean') {
    return assertion;
  }
  if (typeof assertion === 'object') {
    return tiddler.title.startsWith(assertion.titlePrefix);
  }
  if (assertion === 'private') {
    return KNOWN_PRIVATE.has(tiddler.title) || tiddler.title.startsWith(PRIVATE_PREFIX) || ('draft.of' in tiddler)
  }
  throw new Error(`unhandled write condition assertion: ${JSON.stringify(assertion)}`);
}

export const getWriteConditionEvaluator = (writeCondition?: TiddlerStorageWriteCondition) => {
  return (tiddler: $tw.TiddlerFields) => evalExpression(
    _evalWriteCondition,
    writeCondition ?? ALWAYS_TRUE_CONDITION,
    tiddler)
};

export const _evalUseCondition: EvalAssertion<TiddlerStorageUseConditionAssertion, LaunchParameters> = (assertion, launchParameters) => {
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
