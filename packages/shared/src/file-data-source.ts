// url type file references are useful if the file is too large to be passed between
// the outer frame and the sandboxed iframe as a blob.

import { CallbackMap } from "packages/rpc/src/types";

// Otherwise, blobs are better because they can be cached (since the outer frame has a valid domain unlike the sandboxed iframe).
export type FileReference = {type: "url", url: string} | {type: "blob", blob: Blob}

export type FileReferenceType = FileReference["type"];

export interface FileDataSource {
  // full filename relative to the collection dir
  readFile: (filename:string, referenceType?:FileReferenceType) => Promise<FileReference>;
}

export interface UploadEventHandler {
  onProgress: (transferredBytes: number) => Promise<void>,
  onError: (error:any) => Promise<void>,
  onComplete: () => Promise<void>
}

export interface UploadController {
  pause: () => Promise<void>;
  cancel: () => Promise<void>;
  resume: () => Promise<void>;
}

export interface WritableFileDataSource extends FileDataSource {
  // returns the number of bytes written
  writeFile: (
    filename: string,
    contents: Blob,
    metadata?: Record<string, string>,
    uploadEventHandler?: CallbackMap<UploadEventHandler>) => Promise<CallbackMap<UploadController>>;
  deleteFile: (filename: string) => Promise<void>;
}
