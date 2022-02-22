import MiniIframeRPC from "mini-iframe-rpc";
import { apiDefiner, ParentAPI } from "@firebase-auth-loader/rpc";
import {getDownloadURL as _getDownloadURL, getStorage, ref} from '@firebase/storage';
import { firebaseApp } from './init';
import {User} from '@firebase/auth'

const storage = getStorage(firebaseApp);

export const getDownloadURL = async (filename:string) => {
  const fileRef = ref(storage, filename);
  return await _getDownloadURL(fileRef);
};

export const createParentApi = (rpc:MiniIframeRPC, user:User, iframe:Window) => {
  // const childClient = makeAPIClient<ChildAPI>(rpc, iframe);
  const def = apiDefiner<ParentAPI>(rpc);
  def('childIframeReady', async () => {
    return {
      userName: user.displayName!
    }
  });
  def('getDownloadURL', getDownloadURL);
}
