import { makeInvocationObserver } from "../src/invocation-observer";

interface MyInterface {
  foo: (i:number) => number;
  bar: () => void;
  baz: string;
}

describe('invocation observer', function () {

  it('calls subscribed callback when function is invoked', async () => {
    let fooCalledWith:(number|undefined) = undefined;
    const observer = makeInvocationObserver<MyInterface>();
    observer.subscribe('foo', i => {
      fooCalledWith = i;
      return {result: 15};
    });
    expect(fooCalledWith).toBe(undefined);
    expect(observer.foo(5)).toBe(15);
    expect(fooCalledWith).toBe(5 as any);
  });

  it('returns declared properties to Object.keys()', async () => {
    const observer = makeInvocationObserver<MyInterface>({properties: ['foo']});
    expect(Object.keys(observer)).toEqual(['foo']);
  });

})
