import { ReadOnlyFileStorage, FileReference, FileReferenceType } from "@tiddlybase/shared/src/file-data-source";

export class HttpFileStorage implements ReadOnlyFileStorage {
  urlPrefix: string;

  constructor(urlPrefix:string) {
    this.urlPrefix = urlPrefix
  }
  getFullURL(filename: string): string {
    return this.urlPrefix + filename;
  }
  async readFile(filename: string, referenceType?: FileReferenceType): Promise<FileReference> {
    try {
      const url = this.getFullURL(filename);
      if (referenceType === 'url') {
        return {
          type: 'url', url
        }
      }
      return { type: 'blob', blob: await (await (fetch(url))).blob() };
    } catch (e) {
      throw { type: "file-read-error", filename, reason: String(e) }
    }
  }
}
