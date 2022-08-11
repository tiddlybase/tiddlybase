/// <reference types="./tw5" />

declare module "tiddlywiki/boot/bootprefix" {
  export const bootprefix: () => Partial<typeof $tw>
}

declare module "tiddlywiki" {
  export const TiddlyWiki: ($twInstance?: Partial<typeof $tw>) => typeof $tw
}

declare namespace $tw {
  /**
   * Schema for tiddlywiki.info files
   */

  export interface IncludeWiki {
    path: string,
    "read-only"?: boolean
  }

  export type TiddlyWikiInfo = Partial<{
    description: string,
    includeWikis: IncludeWiki[],
    config: Partial<$tw.WikiInfoConfig>,
    plugins: string[],
    themes: string[],
    build: Record<string, string[]>;
  }>
}
