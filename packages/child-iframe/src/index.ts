import { apiDefiner, makeAPIClient, makeRPC } from "@firebase-auth-loader/rpc";
import { ChildAPI, ParentAPI } from "@firebase-auth-loader/rpc";


const main = () => {
  const rpc = makeRPC();
  const parentClient = makeAPIClient<ParentAPI>(rpc, window.parent)
  const def = apiDefiner<ChildAPI>(rpc);
  def('testParentChild', async (message:string) => {
    console.log(message);
  });
  parentClient('childIframeReady', []);
}

window.addEventListener('load', main);
