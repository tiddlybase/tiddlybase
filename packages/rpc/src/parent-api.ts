export interface ChildInitProps {
  userName: string
}

export interface ParentAPI {
  childIframeReady: () => Promise<ChildInitProps>;
  getDownloadURL: (filename:string) => Promise<string>;
}
