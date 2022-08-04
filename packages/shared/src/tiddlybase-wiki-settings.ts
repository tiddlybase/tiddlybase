export interface TiddlybaseWikiSettings {
  // === TiddlyBase additions ===
  "default-storage-prefix": string,
  // relative path of external files referenced by embed-media plugin.
  "default-file-location": string,
  // prefix for relative URLs considered external files which are part of the
  // wiki, hosted on google storage or the local file filesystem (for TiddlyDesktop).
  "external-url-path-prefix": string,
  // 'display-link-icons' - if true, display file type icon when files are
  // linked to instead of embedded.
  "display-link-icons": boolean
}
