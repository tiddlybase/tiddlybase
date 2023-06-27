import type {} from "@tiddlybase/tw5-types/src/index"

const MAX_SIZE = 1048487; // max size of firestore document field in bytes, according to https://firebase.google.com/docs/firestore/quotas#collections_documents_and_fields

// Export name and synchronous status
export const name = 'upload-file';
export const platforms = ['browser'];
export const after = ['startup'];
export const synchronous = true;

const shouldUploadToStorage = (info: $tw.ImportFileInfo) => info.isBinary || info.file.size > MAX_SIZE;

const getMetadata = (info: $tw.ImportFileInfo):Record<string, string> => ({
  uploader: $tw.tiddlybase?.user?.userId ?? '',
  contentType: info.type,
  cacheControl: 'max-age=31536000, immutable'
});

export const startup = function () {
  $tw.hooks.addHook('th-importing-file', (info: $tw.ImportFileInfo) => {
    if (shouldUploadToStorage(info)) {
      window.$tw.tiddlybase!.topLevelClient!('writeFile', [info.file.name, info.file, getMetadata(info)]).then(
        size => {
          info.callback([
            {
              title: info.file.name,
              // TODO: support wikitext as well instead of only supporting markdown
              type: 'text/x-markdown',
              // TODO: make the collection name configurable instead of hardcoding 'files'
              text: `![info.file.name](files/${info.file.name})`,
              tags: ['fileUpload'],
              mimeType: info.type,
              size
            },
          ]);
        }
        // todo: on error
      )
      return true;
    } else {
      return false;
    }
  });
};
