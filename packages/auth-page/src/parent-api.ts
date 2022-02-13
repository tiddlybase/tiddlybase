import MiniIframeRPC from "mini-iframe-rpc";
import { apiDefiner } from "packages/rpc";
import {getDownloadURL,getStorage, ref} from '@firebase/storage';
import { firebaseApp } from './init';

const storage = getStorage(firebaseApp);

export interface ParentAPI {
  childIframeReady: () => Promise<void>;
  getDownloadURL: (filename:string) => Promise<string>;
}

export const createParentApi = (rpc:MiniIframeRPC) => {
  const def = apiDefiner<ParentAPI>(rpc);
  def('childIframeReady', async () => {
    console.log('child iframe ready');
  });
  def('getDownloadURL', async (filename:string) => {
    const fileRef = ref(storage, filename);
    return await getDownloadURL(fileRef);
  });
}
