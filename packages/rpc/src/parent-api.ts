export interface ParentAPI {
  childIframeReady: () => Promise<void>;
  getDownloadURL: (filename:string) => Promise<string>;
}
