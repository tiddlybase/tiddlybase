export interface ChildAPI {
  testParentChild: (message:string)=>Promise<void>;
}
