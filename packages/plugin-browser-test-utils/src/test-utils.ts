import type { Widget } from '@tiddlybase/tw5-types'
import type {} from 'jasmine'

export const sleep = async (ms=1000) => new Promise(resolve => setTimeout(resolve, ms));

export const findNavigator = (parent = $tw.rootWidget):Widget|undefined => {
    const isNavigator = (child:Widget) => child?.parseTreeNode?.type === 'navigator'
    for (let child of parent.children || []) {
        if (isNavigator(child)) {
            // console.log("found navigator as child", child);
            return child;
        }
        // console.log("searching for navigator in children");
        const descendent = findNavigator(child);
        if (descendent) {
            return descendent;
        }

    }
    return undefined;
  };

export type WaitForResolution<T> = {
  label?: string;
  timeout?: number;
  target: T;
  method: keyof T;
  args: any[];
  spy: jasmine.Spy<jasmine.Func>;
}

export type WaitForArgs = {
  label?: string;
  timeout?: number;
}

type WaitingResolveArgs<T> = Omit<WaitForResolution<T>, 'label'|'timeout'>;

export const initSpy = <T>(obj:T, method:keyof T) => {
    let waitingResolves:Array<(resolution:WaitingResolveArgs<T>)=>void> = [];
    const spy:jasmine.Spy<jasmine.Func> = spyOn<T>(obj, method).and.callFake(function (this:T, ...args) {
        let p:typeof waitingResolves[0];
        console.log(`[spy:${method}] invoked function, waitingResolves`, waitingResolves)
        for (p of waitingResolves) {
            console.log("invoking resolver", p)
            p({args, target: (this as unknown as T), method, spy});
        }
        console.log(`[spy:${method}] calling original function ${method}`)
        return (spy.and as any).originalFn.apply(this, args);
    });
    const waitFor = ({label, timeout = 1000}:Partial<WaitForArgs>) => new Promise((resolve, reject) => {
        waitingResolves.push((waitingResolveArgs:WaitingResolveArgs<T>) => resolve({label, timeout, ...waitingResolveArgs}))
        console.log(`[waitFor:${method}] registering new wait for promise ${label}`, waitingResolves);
        sleep(timeout).then(() => reject(new Error(`timeout after waiting ${timeout} waiting ${label}`)));
    });
    return {spy, waitFor}
}

let tw5Navigator:Widget|undefined = undefined;

export const openTiddler = async (navigateTo:string) => {
    tw5Navigator = tw5Navigator ?? findNavigator();
    tw5Navigator?.dispatchEvent({type: "tm-close-all-tiddlers"});
    tw5Navigator?.dispatchEvent({type: "tm-navigate", navigateTo})
    // force interruption of this function so that tiddlywiki events can be dispatched and acted upon.
    return await sleep(0);
};
