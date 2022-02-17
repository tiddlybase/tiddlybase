import { apiDefiner, makeAPIClient, makeRPC } from "@firebase-auth-loader/rpc";
import { ChildAPI, ParentAPI,  } from "@firebase-auth-loader/rpc";
import type {} from "@firebase-auth-loader/tw5-types"
import type { ExtendedTW } from "./addParentClient";


const main = async () => {
  const rpc = makeRPC();
  const parentClient = makeAPIClient<ParentAPI>(rpc, window.parent)
  const def = apiDefiner<ChildAPI>(rpc);
  def('testParentChild', async (message:string) => {
    console.log(message);
  });
  const childInitProps = await parentClient('childIframeReady', []);
  console.log(childInitProps);
  const extendedTW = $tw as ExtendedTW;
  extendedTW.parentClient = parentClient;
  $tw.boot.boot();
}

window.addEventListener('load', main);
