// Typings for TiddlyWiki 5, lots of stuff is still missing.

import { TWTiddlybase } from "./tiddlybase";

// standard tiddler definition, but every field except title is optional, allowing any custom field
export type TiddlerFields = Partial<{
  tags: string[];
  text: string;
  type: string;
  created: Date;
  creator: string;
  modified: Date;
  modifier: string;
}> & Record<string, string>

export interface Tiddler {
  fields: TiddlerFields;
  getFieldDay: () => string;
  getFieldList: (fieldName: string) => any[];
  getFieldString: (fieldName: string) => string;
  getFieldStringBlock: () => string;
  getFieldStrings: (fieldNames: string[]) => string[];
  hasField: (fieldName: string) => boolean;
  hasTag: (tag: string) => boolean;
  isDraft: () => boolean;
  isEqual: (tiddler: Tiddler, excludeFields?: Record<string, boolean>) => boolean;
  isPlugin: () => boolean;
}

export type HTTPMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';

export type Callback = (err: any, ...data: any[]) => void;
export type TiddlerCallback = (tiddler:Tiddler, title:string) => void;

export interface VariableInfo {
  text: string;
  params: any;
  srcVariable: string;
  isCacheable: boolean;
}

type NoArgEventListener = () => void;

// The full list of documented messages is availble at
// https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/tw5.com/tiddlers/messages
export type WidgetAddEventListenerArgs =
  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-auto-save-wiki.html
  | ['tm-auto-save-wiki', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-browser-refresh.html
  | ['tm-browser-refresh', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-clear-browser-storage.html
  | ['tm-clear-browser-storage', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-clear-password.html
  | ['tm-clear-password', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-close-tiddler.html
  | ['tm-close-tiddler', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-consent-accept.html
  | ['tm-consent-accept', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-consent-clear.html
  | ['tm-consent-clear', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-consent-decline.html
  | ['tm-consent-decline', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-copy-syncer-logs-to-clipboard.html
  | ['tm-copy-syncer-logs-to-clipboard', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-copy-to-clipboard.html
  | ['tm-copy-to-clipboard', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-download-file.html
  | ['tm-download-file', (event: Event) => string | undefined]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-focus-selector.html
  | ['tm-focus-selector', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-full-screen.html
  | ['tm-full-screen', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-home.html
  | ['tm-home', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-load-plugin-from-library.html
  | ['tm-load-plugin-from-library', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-load-plugin-library.html
  | ['tm-load-plugin-library', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-login.html
  | ['tm-login', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-logout.html
  | ['tm-logout', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-modal.html
  | ['tm-modal', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-notify.html
  | ['tm-notify', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-open-external-window.html
  | ['tm-open-external-window', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-open-window.html
  | ['tm-open-window', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-permalink.html
  | ['tm-permalink', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-permaview.html
  | ['tm-permaview', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-print.html
  | ['tm-print', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-save-wiki.html
  | ['tm-save-wiki', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-scroll.html
  | ['tm-scroll', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-server-refresh.html
  | ['tm-server-refresh', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-set-password.html
  | ['tm-set-password', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-show-switcher.html
  | ['tm-show-switcher', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-slice-tiddler.html
  | ['tm-slice-tiddler', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-unload-plugin-library.html
  | ['tm-unload-plugin-library', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-zip-add-text-file.html
  | ['tm-zip-add-text-file', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-zip-create.html
  | ['tm-zip-create', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-zip-download.html
  | ['tm-zip-download', NoArgEventListener]

  // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-zip-render-file.html
  | ['tm-zip-render-file', NoArgEventListener]
;

// based on: https://instil.co/blog/crazy-powerful-typescript-tuple-types/
type ConvertEventListener<T> = T extends WidgetAddEventListenerArgs
  ? {
      type: T[0];
      handler: T[1];
    }
  : never;

type ConvertEventListeners<T extends [...any[]]> = T extends [infer Head, ...infer Tail]
  ? [ConvertEventListener<Head>, ...ConvertEventListeners<Tail>]
  : [];

// any module with module-type: parser can extend this type, so it will never be complete.
// from: tiddlywiki/core/modules/parsers/wikiparser/wikiparser.js
export type ParseTree =
  | { type: 'element'; tag: string; attributes?: { [key: string]: string }; children?: ParseTree[] } //- an HTML element
  | { type: 'text'; text: string } // a text node
  | { type: 'entity'; value: string } // - an entity
  | { type: 'raw'; html: string } // - raw HTML
  | { type: 'string'; value: string } // - literal string
  | { type: 'indirect'; textReference: string } // - indirect through a text reference
  | { type: 'macro'; macro: any /*<TBD>*/ }
  // from: tiddlywiki/core/modules/parsers/textparser.js
  | {
      type: 'codeblock';
      attributes: {
        code: { type: 'string'; value: string /*text*/ };
        language: { type: 'string'; value: string /*type*/ };
      };
    }
  // from: tiddlywiki/core/modules/parsers/csvparser.js
  | { type: 'scrollable'; children?: ParseTree[] };

// TODO, what's an event in Widget context?
export type Event = any;

// Widget documentation: https://tiddlywiki.com/dev/static/WidgetModules.html
export interface Widget {
  parentDomNode: HTMLElement;
  parseTreeNode: ParseTree;
  wiki: Wiki;
  parentWidget: Widget;
  document: Document;
  attributes: Record<string, string>;
  children: Widget[];
  domNodes: HTMLElement[];

  addEventListener(...args: WidgetAddEventListenerArgs): void;
  addEventListeners<T extends [...any[]]>(...listeners: ConvertEventListeners<T>): void;
  allowActionPropagation(): boolean;
  assignAttributes(domNode: HTMLElement, options: any): void;
  computeAttributes(): { [key: string]: boolean };
  dispatchEvent(event: Event): void;
  evaluateMacroModule(name: string, actualParams: any, defaultValue: any): any;
  execute(): void;
  findFirstDomNode(): HTMLElement | null;
  findNextSiblingDomNode(startIndex: number): HTMLElement | null;
  getAttribute(name: string, defaultText?: string): any;
  getStateQualifier(name: string): string;
  getVariable(name: string, options: any): any;
  getVariableInfo(name: string, options: any): any;
  hasAttribute(name: string): boolean;
  hasVariable(name: string, value?: any): boolean;
  initialise(parseTreeNode: ParseTree, options: any): void;
  invokeActionString(actions: string, triggeringWidget: Widget, event: Event, variables: any): any;
  invokeActions(triggeringWidget: Widget, event: Event): void;
  invokeActionsByTag(tag: string, event: Event, variables: any): any;
  makeChildWidget(parseTreeNode: ParseTree): void;
  makeChildWidgets(parseTreeNodes: ParseTree[]): void;
  nextSibling(): HTMLElement | null;
  previousSibling(): HTMLElement | null;
  refresh(changedTiddlers: Record<string, boolean>): boolean;
  refreshChildren(changedTiddlers: Tiddler[]): void;
  refreshSelf(): void;
  removeChildDomNodes(): void;
  render(parent: HTMLElement, nextSibling: HTMLElement): void;
  renderChildren(parent: HTMLElement, nextSibling: HTMLElement): void;
  resolveVariableParameters(formalParams: any, actualParams: any): any;
  setVariable(name: string, value: any, params: any, isMacroDefinition: boolean): void;
  substituteVariableReferences(text: string): string;
}

export interface WidgetConstructorOptions {
  wiki: Wiki; // mandatory reference to wiki associated with this render tree
  parentWidget: Widget; // optional reference to a parent renderer node for the context chain
  document?: Document; // optional document object to use instead of global document
}

export interface WidgetConstructor {
  new (parseTreeNode: ParseTree, options: WidgetConstructorOptions): Widget;
}

export type TiddlerChangeType = 'deleted' | 'modified';

export type WikiChange = Record<string, Record<TiddlerChangeType, boolean> & { changeCount: number }>;

export type WikiAddEventListenerArgs =
  | ['change', (wikiChange: WikiChange) => void]
  | ['lazyload', (title: string) => void];

export interface Wiki {
  addEventListener: (...args: WikiAddEventListenerArgs) => void;
  // addIndexer: (indexer,name)  => void;
  // addIndexersToWiki: ()  => void;
  // addTiddler: (tiddler)  => void;
  // addTiddlers: (tiddlers)  => void;
  // addToHistory: (title,fromPageRect,historyTitle)  => void;
  // addToStory: (title,fromTitle,storyTitle,options)  => void;
  allShadowTitles: ()  => string[];
  allTitles: ()  => string[];
  // checkTiddlerText: (title,targetText,options)  => void;
  clearCache: (title: string)  => void;
  clearGlobalCache: ()  => void;
  // clearTiddlerEventQueue: ()  => void;
  // compileFilter: (filterString)  => void;
  // countTiddlers: (excludeTag)  => void;
  // defineShadowModules: ()  => void;
  // defineTiddlerModules: ()  => void;
  // deleteTextReference: (textRef,currTiddlerTitle)  => void;
  deleteTiddler: (title:string)  => void;
  // deserializeTiddlers: (type,text,srcFields,options)  => void;
  // dispatchEvent: (type /*, args */)  => void;
  // doesPluginInfoRequireReload: (pluginInfo)  => void;
  // doesPluginRequireReload: (title)  => void;
  each: (callback:TiddlerCallback)  => void;
  eachShadow: (callback:TiddlerCallback)  => void;
  eachShadowPlusTiddlers: (callback:TiddlerCallback)  => void;
  eachTiddlerPlusShadows: (callback:TiddlerCallback)  => void;
  // enqueueTiddlerEvent: (title,isDeleted)  => void;
  // extractLinks: (parseTreeRoot)  => void;
  // extractTiddlerDataItem: (titleOrTiddler,index,defaultText)  => void;
  // filterTiddlers: (filterString,widget,source)  => void;
  // findDraft: (targetTitle)  => void;
  // findListingsOfTiddler: (targetTitle,fieldName)  => void;
  // forEachTiddler: (/* [options,]callback */)  => void;
  // generateDraftTitle: (title)  => void;
  // generateNewTitle: (baseTitle,options)  => void;
  // getCacheForTiddler: (title,cacheName,initializer)  => void;
  // getChangeCount: (title)  => void;
  // getCreationFields: ()  => void;
  // getFilterOperators: ()  => void;
  // getFilterRunPrefixes: ()  => void;
  // getGlobalCache: (cacheName,initializer)  => void;
  // getIndexer: (name)  => void;
  getMissingTitles: ()  => string[];
  // getModificationFields: ()  => void;
  getOrphanTitles: ()  => string[];
  // getPluginInfo: (title)  => void;
  getPluginTypes: ()  => string[];
  getRelinkableTitles: ()  => string[];
  // getShadowSource: (title)  => void;
  // getSizeOfTiddlerEventQueue: ()  => void;
  getSubTiddler: (title: string,subTiddlerTitle: string)  => string | undefined;
  // getTagMap: ()  => void;
  // getTextReference: (textRef,defaultText,currTiddlerTitle)  => void;
  // getTextReferenceParserInfo: (title,field,index,options)  => void;
  getTiddler: (title: string) => Tiddler | undefined;
  // getTiddlerAsJson: (title)  => void;
  // getTiddlerBacklinks: (targetTitle)  => void;
  // getTiddlerData: (titleOrTiddler,defaultData)  => void;
  // getTiddlerDataCached: (titleOrTiddler,defaultData)  => void;
  // getTiddlerLinks: (title)  => void;
  // getTiddlerList: (title,field,index)  => void;
  // getTiddlerRelinkBackreferences: (title)  => void;
  // getTiddlerRelinkReferences: (title)  => void;
  getTiddlerText: (title: string, fallback?: string) => string | undefined;
  // getTiddlers: (options)  => void;
  // getTiddlersAsJson: (filter,spaces)  => void;
  // getTiddlersWithTag: (tag)  => void;
  // importTiddler: (tiddler)  => void;
  // initParsers: (moduleType)  => void;
  // invokeUpgraders: (titles,tiddlers)  => void;
  // isBinaryTiddler: (title)  => void;
  // isDraftModified: (title)  => void;
  // isImageTiddler: (title)  => void;
  // isShadowTiddler: (title)  => void;
  // isSystemTiddler: (title)  => void;
  // isTemporaryTiddler: (title)  => void;
  // isVolatileTiddler: (title)  => void;
  // makeTiddlerIterator: (titles)  => void;
  // makeTranscludeWidget: (title,options)  => void;
  // makeWidget: (parser,options)  => void;
  // parseFilter: (filterString)  => void;
  // parseText: (type,text,options)  => void;
  // parseTextReference: (title,field,index,options)  => void;
  // parseTiddler: (title,options)  => void;
  // processSafeMode: ()  => void;
  // readFile: (file,options)  => void;
  // readFileContent: (file,type,isBinary,deserializer,callback)  => void;
  // readFiles: (files,options)  => void;
  // readPluginInfo: (titles)  => void;
  // registerPluginTiddlers: (pluginType,titles)  => void;
  // relinkTiddler:  relinkTiddler(fromTitle, toTitle, options)  => void;
  // removeEventListener: (type,listener)  => void;
  // renameTiddler:  renameTiddler(fromTitle,toTitle,options)  => void;
  // renderText: (outputType,textType,text,options)  => void;
  // renderTiddler: (outputType,title,options)  => void;
  // search: (text,options)  => void;
  // setText: (title,field,index,value,options)  => void;
  // setTextReference: (textRef,value,currTiddlerTitle)  => void;
  // setTiddlerData: (title,data,fields)  => void;
  // slugify: (title,options)  => void;
  // sortByList: (array,listTitle)  => void;
  // sortTiddlers: (titles,sortField,isDescending,isCaseSensitive,isNumeric,isAlphaNumeric)  => void;
  tiddlerExists: (title: string) => boolean;
  // unpackPluginTiddlers: ()  => void;
  // unregisterPluginTiddlers: (pluginType,titles)  => void;
}

export interface SyncAdaptorTiddlerInfo {
  bag?: string;
}

// Documented at https://tiddlywiki.com/dev/static/SyncAdaptorModules.html
export interface SyncAdaptor {
  name?: string;
  supportsLazyLoading?: boolean;
  setLoggerSaveBuffer?: (buffer: any) => void;
  isReady: () => boolean;
  getTiddlerInfo: (tiddler: Tiddler) => SyncAdaptorTiddlerInfo | undefined;
  getTiddlerRevision: (title: string) => string | undefined;
  getStatus: (callback: Callback) => void;
  // login, logout not used
  saveTiddler: (tiddler: Tiddler, callback: Callback) => void;
  loadTiddler: (title: string, callback: Callback) => void;
  deleteTiddler: (
    title: string,
    callback: Callback,
    options: {
      tiddlerInfo: {
        adaptorInfo: SyncAdaptorTiddlerInfo;
      };
    },
  ) => void;
}

export interface Logger {
  setSaveBuffer: (buffer: any) => void;
  log: (message: string, ...data: any[]) => void;
}

export interface LoggerConstructor {
  new (loggerName?: string): Logger;
}

export interface TiddlerConstructor {
  new (...fields: Tiddler['fields'][]): Tiddler;
}

export interface Translator {
  getString: (label: string) => string;
}

export interface ImportFileInfo {
  file: File;
  type: string;
  isBinary: boolean;
  callback: Callback;
}

// For more information on the hook mechanism, see:
// https://tiddlywiki.com/dev/static/HookMechanism.html
// Full list of documented hooks:
// https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/
export type AddHookArguments =
  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-before-importing.tid
  | ['th-before-importing.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-closing-tiddler.tid
  | ['th-closing-tiddler.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-deleting-tiddler.tid
  | ['th-deleting-tiddler.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-editing-tiddler.tid
  | ['th-editing-tiddler.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-importing-file.tid
  | ['th-importing-file.tid', /* importFunction*/ (info: ImportFileInfo) => boolean]

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-importing-tiddler.tid
  | ['th-importing-tiddler.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_th-make-tiddler-path.tid
  | ['th-make-tiddler-path.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-navigating.tid
  | ['th-navigating.tid']

  // https://tiddlywiki.com/dev/static/Hook%253A%2520th-opening-default-tiddlers-list.html
  | ['th-opening-default-tiddlers-list', /* getDefaultList */ (tiddlerTitles: string[]) => string[]]

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-page-refreshed.tid
  | ['th-page-refreshed.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-page-refreshing.tid
  | ['th-page-refreshing.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-relinking-tiddler.tid
  | ['th-relinking-tiddler.tid']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-renaming-tiddler.tid
  | ['th-renaming-tiddler.tid', /*newTiddlerTitle*/ string, /*oldTiddlerTitle*/ string]

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-rendering-element.tid
  | ['th-rendering-element.tid']

  // https://tiddlywiki.com/dev/static/Hook%253A%2520th-saving-tiddler.html
  | ['th-saving-tiddler']

  // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-server-command-post-start.tid
  | ['th-server-command-post-start.tid'];

export interface DomMakerOptions {
  document: Document;
  class: string;
}

export type WikiInfoConfig = Partial<{
  // === Standard TiddlyWiki5 config keys, see: https://tiddlywiki.com/static/tiddlywiki.info%2520Files.html ===

  // default-tiddler-location - a string path to the default location for the filesystem adaptor to save new tiddlers (resolved relative to the wiki folder)
  "default-tiddler-location": string,
  // retain-original-tiddler-path - If true, the server will generate a tiddler $:/config/OriginalTiddlerPaths containing the original file paths of each tiddler in the wiki
  "retain-original-tiddler-path": boolean,
  // === TiddlyBase additions ===
  "default-storage-prefix": string,
  "default-file-location": string,
  // 'display-link-icons' - if true, display
  "display-link-icons": boolean
}>

export interface TW {
  utils: {
    // defined in tiddlywiki/core/modules/utils/dom/http.js
    httpRequest: (
      options: Partial<{
        type: HTTPMethod;
        url: string;
        headers: Record<string, string>;
        data: string;
        callback: Callback;
      }>,
    ) => void;
    Logger: LoggerConstructor;
    error: (message: string) => void;
    domMaker: (tag: string, options: DomMakerOptions) => HTMLElement;
    formatDateString(date: Date, format: string): string;
    getLocationPath: () => string;
  };
  boot: {
    boot: () => void;
    wikiInfo?: {
      config: WikiInfoConfig;
    }
  };
  wiki: Wiki;
  Tiddler: TiddlerConstructor;
  preloadTiddlerArray: (tiddlerFields: TiddlerFields[]) => void;
  language?: Translator;
  hooks: {
    addHook: (...args: AddHookArguments) => void;
  };
  browser? : {
    isIE: boolean,
    isFirefox: boolean
  };
  platform? : {
    isMac: boolean,
    isWindows: boolean,
    isLinux: boolean};
  node? : unknown;
  desktop? : {
    gui: unknown;
    utils: unknown;
  }
  // non-standard extension
  tiddlybase?: TWTiddlybase
}

declare global {
  const $tw: TW;
}
