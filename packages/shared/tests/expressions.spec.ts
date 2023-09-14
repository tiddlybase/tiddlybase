import { EvalAssertion, evalExpression } from "../src/expressions";

describe('expressions', function () {

  const evalBoolAssertion:EvalAssertion<boolean, null> = b => b;

  it('literal boolean expressions', async () => {
    expect(evalExpression(evalBoolAssertion, true, null)).toEqual(true);
    expect(evalExpression(evalBoolAssertion, false, null)).toEqual(false);
  });

  it('and boolean expressions', async () => {
    expect(evalExpression(evalBoolAssertion, {and: [true, false]}, null)).toEqual(false);
    expect(evalExpression(evalBoolAssertion, {and: [true, true]}, null)).toEqual(true);
  });

  it('or boolean expressions', async () => {
    expect(evalExpression(evalBoolAssertion, {or: [true, false]}, null)).toEqual(true);
    expect(evalExpression(evalBoolAssertion, {or: [false, false]}, null)).toEqual(false);
  });

  it('not boolean expressions', async () => {
    expect(evalExpression(evalBoolAssertion, {not: true}, null)).toEqual(false);
    expect(evalExpression(evalBoolAssertion, {not: false}, null)).toEqual(true);
  });

});
