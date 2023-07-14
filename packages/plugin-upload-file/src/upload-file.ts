import type {} from "@tiddlybase/tw5-types/src/index"
import { UploadEventHandler } from "@tiddlybase/shared/src/file-data-source";
import { makeInvocationObserver } from "@tiddlybase/shared/src/invocation-observer";

const MAX_SIZE = 1048487; // max size of firestore document field in bytes, according to https://firebase.google.com/docs/firestore/quotas#collections_documents_and_fields
const UPLOAD_MODAL_TIDDLER = "$:/plugins/tiddlybase/upload-file/upload-modal";

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
    uploader: $tw.tiddlybase?.user?.userId,
  }
});

export const startup = function () {
  $tw.hooks.addHook('th-importing-file', (info: $tw.ImportFileInfo) => {
    const filename = info.file.name;
    // TODO: make the collection name configurable instead of hardcoding 'files'
    const path =  `files/${encodeURIComponent(filename)}`;
    const filesize = info.file.size;
    const tiddler:$tw.TiddlerFields = {
      title: filename,
      // TODO: support wikitext as well instead of only supporting markdown
      type: 'text/x-markdown',
      // TODO: make the collection name configurable instead of hardcoding 'files'
      text: `![${filename}](${path})`,
      tags: ['file-upload'],
      "file-upload:mime-type": info.type,
      "file-upload:path": path,
      "file-upload:size": filesize
    }
    if (shouldUploadToStorage(info)) {
      const uploadObserver = makeInvocationObserver<UploadEventHandler>({properties: ['onComplete', 'onProgress', 'onError']});
      const uploadObserverCallbackMap = $tw.tiddlybase?.rpcCallbackManager?.registerObject<UploadEventHandler>(uploadObserver);
      const uploadController = window.$tw.tiddlybase!.topLevelClient!('writeFile', [encodeURIComponent(filename), info.file, getMetadata(info), uploadObserverCallbackMap]).then(
        uploadControllerCallbackMap => $tw.tiddlybase?.rpcCallbackManager?.makeStubObject(uploadControllerCallbackMap));
      openModal(UPLOAD_MODAL_TIDDLER, {
        uploadObserver, uploadController, filename, filesize
      })
      uploadObserver.subscribe('onComplete', () => {
        info.callback([tiddler]);
        return undefined;
      });
      return true;
    } else {
      return false;
    }
  });
};
