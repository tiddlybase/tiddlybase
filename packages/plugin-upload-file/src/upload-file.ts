import type {} from "@tiddlybase/tw5-types/src/index"
import { UploadEventHandler } from "@tiddlybase/shared/src/file-storage";
import { makeInvocationObserver } from "@tiddlybase/shared/src/invocation-observer";
import {createSession, destroySession} from "./upload-sessions"
import {TIDDLYBASE_TITLE_USER_PROFILE} from "@tiddlybase/shared/src/constants";

const MAX_SIZE = 1048487; // max size of firestore document field in bytes, according to https://firebase.google.com/docs/firestore/quotas#collections_documents_and_fields
const UPLOAD_MODAL_TIDDLER = "$:/plugins/tiddlybase/upload-file/upload-modal";
const CREATE_WIKITEXT_TIDDLERS_CONFIG = "$:/plugins/tiddlybase/upload-file/create-wikitext-tiddlers";

// Export name and synchronous status
export const name = 'upload-file';
export const platforms = ['browser'];
export const after = ['startup'];
export const synchronous = true;

const shouldUploadToStorage = (info: $tw.ImportFileInfo) => info.isBinary || info.file.size > MAX_SIZE;

const openModal = (tiddler: string, variables:any) => {
  $tw.rootWidget.dispatchEvent({
    param: tiddler,
    paramObject: variables ?? {},
    type: "tm-modal"})
}

const getMetadata = (info: $tw.ImportFileInfo):Record<string, any> => ({
  contentType: info.type,
  cacheControl: 'public, max-age=31536000',
  customMetadata: {
    // TODO: handle case if user isn't logged in
    uploader: $tw.wiki.getTiddler(TIDDLYBASE_TITLE_USER_PROFILE)?.fields?.userId
  }
});

export const startup = function () {
  $tw.hooks.addHook('th-importing-file', (info: $tw.ImportFileInfo) => {
    const createWikiTextTiddlers = $tw.wiki.getTiddler(CREATE_WIKITEXT_TIDDLERS_CONFIG)?.fields?.text?.toLowerCase()?.trim() === 'true'
    const filename = info.file.name;
    // TODO: make the collection name configurable instead of hardcoding 'files'
    const path =  `files/${encodeURIComponent(filename)}`;
    const filesize = info.file.size;
    const tiddler:$tw.TiddlerFields = {
      title: filename,
      type: createWikiTextTiddlers ? 'text/vnd.tiddlywiki' : 'text/x-markdown',
      tags: ['file-upload'],
      "file-upload:mime-type": info.type,
      "file-upload:path": path,
      "file-upload:size": filesize
    }
    if (shouldUploadToStorage(info)) {
      const uploadObserver = makeInvocationObserver<UploadEventHandler>({properties: ['onComplete', 'onProgress', 'onError']});
      const uploadObserverCallbackMap = $tw.tiddlybase?.rpcCallbackManager?.registerObject<UploadEventHandler>(uploadObserver);
      const uploadController = $tw.tiddlybase!.topLevelClient!('writeFile', [path, info.file, getMetadata(info), uploadObserverCallbackMap]).then(
        uploadControllerCallbackMap => $tw.tiddlybase?.rpcCallbackManager?.makeStubObject(uploadControllerCallbackMap));
      const sessionId = createSession({
        uploadObserver, uploadController, filename, filesize, path
      })
      openModal(UPLOAD_MODAL_TIDDLER, {
        sessionId
      })
      uploadObserver.subscribe('onComplete', () => {
        destroySession(sessionId);
        if (!createWikiTextTiddlers) {
          tiddler.text = `![${filename}](${path})`;
          info.callback([tiddler]);
        } else {
          // for WikiText tiddlers, pre-resolve the URL
          window.$tw.tiddlybase!.topLevelClient!('readFile', [path, 'url']).then(url => {
            if (url.type === 'url') {
              tiddler.text = `[img[${filename}|${url.url}]]`;
            } else {
              console.error('could not resolve URL for image after file upload')
            }
            info.callback([tiddler]);
          }, info.callback);
        }
        return undefined;
      });
      return true;
    } else {
      return false;
    }
  });
};
