export type FileStorageErrorType = 'unsupported-operation' | 'network-error' | 'unauthorized' | 'unknown';

export class FileStorageError extends Error {
  constructor(public code: FileStorageErrorType, message: string) {
      super(message);
  }
}
