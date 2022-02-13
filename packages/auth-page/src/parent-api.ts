import MiniIframeRPC from "mini-iframe-rpc";
import { apiDefiner, ParentAPI, ChildAPI, makeAPIClient } from "@firebase-auth-loader/rpc";
import {getDownloadURL,getStorage, ref} from '@firebase/storage';
import { firebaseApp } from './init';
import {User} from '@firebase/auth'

const storage = getStorage(firebaseApp);

export const createParentApi = (rpc:MiniIframeRPC, user:User, iframe:Window) => {
  const childClient = makeAPIClient<ChildAPI>(rpc, iframe);
  const def = apiDefiner<ParentAPI>(rpc);
  def('childIframeReady', async () => {
    console.log('child iframe ready');
    await childClient('testParentChild', [`asdf ${user.displayName}`]);
  });
  def('getDownloadURL', async (filename:string) => {
    const fileRef = ref(storage, filename);
    const url = await getDownloadURL(fileRef);
    console.log(`download url for ${filename} is ${url}`)
    return url;
  });
}
