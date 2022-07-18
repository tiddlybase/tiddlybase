// methods required to set up communication with child
export interface ParentAPIBase<ChildInitProps> {
  childIframeReady: () => Promise<ChildInitProps>;
}
