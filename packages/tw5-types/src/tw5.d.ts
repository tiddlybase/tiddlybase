/// <reference types="./widget-events" />

// Type definitions for tiddlywiki 5.2.2
// Project: tiddlywiki
// Definitions by: Peter Neumark <peter@peterneumark.com>

// Lots of stuff is still missing.

declare namespace $tw {

  // based on: https://stackoverflow.com/a/73057552
  type ValueFor<T, K> = T extends [any, any]
  ? K extends T[0]
  ? T[1]
  : never
  : never

  // standard tiddler definition, but every field except title is optional, allowing any custom field
  export type TiddlerFields = { title: string } & Partial<{
    tags: string[];
    text: string;
    type: string;
    created: Date;
    creator: string;
    modified: Date;
    modifier: string;
  }> & Record<string, any>

  export class Tiddler {
    constructor(...fields: Partial<TiddlerFields>[]);
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
  export type TiddlerCallback = (tiddler: Tiddler, title: string) => void;

  export interface VariableInfo {
    text: string;
    params: any;
    srcVariable: string;
    isCacheable: boolean;
  }

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
    | { type: 'scrollable'; children?: ParseTree[] }
    | { type: string, attributes: any };

  export class Parser {
    constructor(type: string | null | undefined, text: string, options?: Partial<{
      parseAsInline: boolean,
      wiki: Wiki,
      _canonical_uri?: string
    }>);
    readonly tree: ParseTree[]
  }

  export type ChangedTiddlers = Record<string, boolean>;

  // Widget documentation: https://tiddlywiki.com/dev/static/WidgetModules.html

  type WidgetDOMEventField = { event: Event }
  // based on: https://stackoverflow.com/a/73057552
  type WidgetEventForType<T, K> = T extends $tw.Widget.WidgetEvent
    ? K extends T["type"]
    ? T
    : never
    : never

  type WidgetEventListener<K extends $tw.Widget.WidgetEvent["type"]> = (event: WidgetEventForType<$tw.Widget.WidgetEvent, K> & WidgetDOMEventField) => boolean | undefined | void
  type WidgetEventListeners = { [K in $tw.Widget.WidgetEvent["type"]]?: WidgetEventListener<K>; }

  export class Widget {
    parentDomNode: HTMLElement;
    parseTreeNode: ParseTree;
    wiki: Wiki;
    parentWidget: Widget;
    document: Document;
    attributes: Record<string, string>;
    children: Widget[];
    domNodes: HTMLElement[];
    constructor(parseTreeNode: ParseTree, options: {
      wiki: Wiki; // mandatory reference to wiki associated with this render tree
      parentWidget?: Widget; // optional reference to a parent renderer node for the context chain
      document?: Document; // optional document object to use instead of global document
      variables?: Record<string, any>
    });
    addEventListener: <K extends $tw.Widget.WidgetEvent["type"]>(
      eventType: K,
      listener: WidgetEventListener<K>
    ) => void;
    eventListeners: WidgetEventListeners

    dispatchEvent(event: $tw.Widget.WidgetEvent): void;

    allowActionPropagation(): boolean;
    assignAttributes(domNode: HTMLElement, options: any): void;
    computeAttributes(): { [key: string]: boolean };
    evaluateMacroModule(name: string, actualParams: any, defaultValue: any): any;
    execute(): void;
    findFirstDomNode(): HTMLElement | null;
    findNextSiblingDomNode(startIndex: number): HTMLElement | null;
    getAttribute(name: string, defaultText?: string): any;
    getStateQualifier(name: string): string;
    getVariable(name: string, options?: any): any;
    getVariableInfo(name: string, options?: any): any;
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
    refresh(changedTiddlers: ChangedTiddlers): boolean;
    refreshChildren(changedTiddlers: ChangedTiddlers): boolean;
    refreshSelf(): void;
    removeChildDomNodes(): void;
    render(parent: HTMLElement, nextSibling?: HTMLElement): void;
    renderChildren(parent: HTMLElement, nextSibling: HTMLElement): void;
    resolveVariableParameters(formalParams: any, actualParams: any): any;
    setVariable(name: string, value: any, params: any, isMacroDefinition: boolean): void;
    substituteVariableReferences(text: string): string;
  }

  export type TiddlerChangeType = 'deleted' | 'modified';

  export type WikiChange = Record<string, Record<TiddlerChangeType, boolean> & { changeCount?: number }>;

  export type WikiAddEventListenerArgs =
    | ['change', (wikiChange: WikiChange) => void]
    | ['lazyload', (title: string) => void];

  export interface Wiki {
    changeCount: Record<string, number>;
    addEventListener: <K extends WikiAddEventListenerArgs[0]>(
      eventType: K,
      handler: ValueFor<WikiAddEventListenerArgs, K>
      ) => void;
    // addIndexer: (indexer,name)  => void;
    // addIndexersToWiki: ()  => void;
    addTiddler: (tiddler: Tiddler | TiddlerFields) => void;
    addTiddlers: (tiddlers: (Tiddler | TiddlerFields)[])  => void;
    addToHistory: (title: string, fromPageRect?: any, historyTitle?: string) => void; // TODO: any
    // addToStory: (title,fromTitle,storyTitle,options)  => void;
    allShadowTitles: () => string[];
    allTitles: () => string[];
    // checkTiddlerText: (title,targetText,options)  => void;
    clearCache: (title: string) => void;
    clearGlobalCache: () => void;
    // clearTiddlerEventQueue: ()  => void;
    // compileFilter: (filterString)  => void;
    // countTiddlers: (excludeTag)  => void;
    // defineShadowModules: ()  => void;
    // defineTiddlerModules: ()  => void;
    // deleteTextReference: (textRef,currTiddlerTitle)  => void;
    deleteTiddler: (title: string) => void;
    // deserializeTiddlers: (type,text,srcFields,options)  => void;
    // dispatchEvent: (type /*, args */)  => void;
    // doesPluginInfoRequireReload: (pluginInfo)  => void;
    // doesPluginRequireReload: (title)  => void;
    each: (callback: TiddlerCallback) => void;
    eachShadow: (callback: TiddlerCallback) => void;
    eachShadowPlusTiddlers: (callback: TiddlerCallback) => void;
    eachTiddlerPlusShadows: (callback: TiddlerCallback) => void;
    // enqueueTiddlerEvent: (title,isDeleted)  => void;
    // extractLinks: (parseTreeRoot)  => void;
    // extractTiddlerDataItem: (titleOrTiddler,index,defaultText)  => void;
    filterTiddlers: (filterString: string, widget?: $tw.Widget, source?: string[] | Record<string, any>) => string[];
    // findDraft: (targetTitle)  => void;
    // findListingsOfTiddler: (targetTitle,fieldName)  => void;
    // forEachTiddler: (/* [options,]callback */)  => void;
    // generateDraftTitle: (title)  => void;
    // generateNewTitle: (baseTitle,options)  => void;
    // getCacheForTiddler: (title,cacheName,initializer)  => void;
    getChangeCount: (title: string) => number;
    getCreationFields: () => Partial<TiddlerFields>;
    // getFilterOperators: ()  => void;
    // getFilterRunPrefixes: ()  => void;
    // getGlobalCache: (cacheName,initializer)  => void;
    // getIndexer: (name)  => void;
    getMissingTitles: () => string[];
    getModificationFields: () => Partial<TiddlerFields>;
    getOrphanTitles: () => string[];
    // getPluginInfo: (title)  => void;
    getPluginTypes: () => string[];
    getRelinkableTitles: () => string[];
    // getShadowSource: (title)  => void;
    // getSizeOfTiddlerEventQueue: ()  => void;
    getSubTiddler: (title: string, subTiddlerTitle: string) => string | undefined;
    // getTagMap: ()  => void;
    // getTextReference: (textRef,defaultText,currTiddlerTitle)  => void;
    // getTextReferenceParserInfo: (title,field,index,options)  => void;
    getTiddler: (title: string) => Tiddler | undefined;
    // getTiddlerAsJson: (title)  => void;
    // getTiddlerBacklinks: (targetTitle)  => void;
    // getTiddlerData: (titleOrTiddler,defaultData)  => void;
    // getTiddlerDataCached: (titleOrTiddler,defaultData)  => void;
    // getTiddlerLinks: (title)  => void;
    getTiddlerList: (title: string, field: string, index: number) => string[];
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
    isImageTiddler: (title: string) => boolean;
    isShadowTiddler: (title: string) => boolean;
    isSystemTiddler: (title: string) => boolean;
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
    removeEventListener: (...args: WikiAddEventListenerArgs) => void;
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

  export class Story {
    constructor (options:{
      wiki: Wiki,
      storyTitle: string,
      historyTitle: string});
    addToHistory: (navigateTo: string /*, navigateFromClientRect*/) => void
    /*
    addToStory: (navigateTo,navigateFromTitle,options) =>
    getStoryList()
    navigateTiddler (navigateTo,navigateFromTitle,navigateFromClientRect) =>
    saveStoryList (storyList)
    storyCancelTiddler (targetTitle)
    storyCloseAllTiddlers ()
    storyCloseOtherTiddlers (targetTitle)
    storyCloseTiddler (targetTitle)
    storyDeleteTiddler (targetTitle)
    storyEditTiddler (targetTitle)
    storyNewTiddler (targetTitle)
    storySaveTiddler (targetTitle)
    */
  }

  export interface SyncAdaptorTiddlerInfo {
    bag?: string;
  }

  // Documented at https://tiddlywiki.com/dev/static/SyncAdaptorModules.html
  export interface SyncAdaptor {
    deleteTiddler: (
      title: string,
      callback: Callback,
      options: {
        tiddlerInfo: {
          adaptorInfo: SyncAdaptorTiddlerInfo;
        };
      },
    ) => void;
    getSkinnyTiddlers?: (callback: Callback) => void;
    getStatus?: (callback: Callback) => void;
    getTiddlerInfo: (tiddler: Tiddler) => SyncAdaptorTiddlerInfo | undefined;
    getTiddlerRevision?: (title: string) => string | undefined;
    getUpdatedTiddlers?: (syncer: any, callback: Callback) => void;
    isReady: () => boolean;
    loadTiddler: (title: string, callback: Callback) => void;
    login?: (username: string, password: string, callback: Callback) => void;
    logout?: (callback: Callback) => void;
    name?: string;
    saveTiddler: (tiddler: Tiddler, callback: Callback) => void;
    setLoggerSaveBuffer?: (buffer: any) => void;
    supportsLazyLoading?: boolean;
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
  type HOOK_PLACEHOLDER = () => {};

  export type AddHookArguments =
    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-before-importing.tid
    | ['th-before-importing', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-closing-tiddler.tid
    | ['th-closing-tiddler', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-deleting-tiddler.tid
    | ['th-deleting-tiddler', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-editing-tiddler.tid
    | ['th-editing-tiddler', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-importing-file.tid
    | ['th-importing-file', /* importFunction*/ (info: ImportFileInfo) => boolean]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-importing-tiddler.tid
    | ['th-importing-tiddler', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_th-make-tiddler-path.tid
    | ['th-make-tiddler-path', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-navigating.tid
    | ['th-navigating', (event: $tw.Widget.NavigateEvent) => $tw.Widget.NavigateEvent]

    // https://tiddlywiki.com/dev/static/Hook%253A%2520th-opening-default-tiddlers-list.html
    | ['th-opening-default-tiddlers-list', /* getDefaultList */ (tiddlerTitles: string[]) => string[]]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-page-refreshed.tid
    | ['th-page-refreshed', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook_%20th-page-refreshing.tid
    | ['th-page-refreshing', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-relinking-tiddler.tid
    | ['th-relinking-tiddler', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-renaming-tiddler.tid
    | ['th-renaming-tiddler', (newTiddlerTitle: string, oldTiddlerTitle: string) => string]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-rendering-element.tid
    | ['th-rendering-element', HOOK_PLACEHOLDER]

    // https://tiddlywiki.com/dev/static/Hook%253A%2520th-saving-tiddler.html
    | ['th-saving-tiddler', HOOK_PLACEHOLDER]

    // https://github.com/Jermolene/TiddlyWiki5/tree/master/editions/dev/tiddlers/new/Hook__th-server-command-post-start.tid
    | ['th-server-command-post-start', HOOK_PLACEHOLDER];

  export interface DomMakerOptions {
    document: Document;
    class: string;
  }

  export interface WikiInfoConfig {
    // === Standard TiddlyWiki5 config keys, see: https://tiddlywiki.com/static/tiddlywiki.info%2520Files.html ===

    // default-tiddler-location - a string path to the default location for the filesystem adaptor to save new tiddlers (resolved relative to the wiki folder)
    "default-tiddler-location": string,
    // retain-original-tiddler-path - If true, the server will generate a tiddler $:/config/OriginalTiddlerPaths containing the original file paths of each tiddler in the wiki
    "retain-original-tiddler-path": boolean,
  }

  // generated with JSON.stringify(Object.keys($tw.modules.types)).replace(/,/g, "|")
  export type ModuleType = "tiddlerfield" | "tiddlerdeserializer" | "startup" | "global" | "command" | "config" | "library" | "bitmapeditoroperation" | "texteditoroperation" | "filterrunprefix" | "filteroperator" | "allfilteroperator" | "formatfilteroperator" | "isfilteroperator" | "wikimethod" | "indexer" | "info" | "macro" | "parser" | "utils" | "wikirule" | "saver" | "authenticator" | "route" | "storyview" | "tiddlermethod" | "upgrader" | "animation" | "utils-node" | "widget" | "widget-subclass";

  export type ModuleExports = Record<string, any>;

  export type TW5Module = {
    definition: string | object,
    exports?: ModuleExports,
    moduleType: ModuleType,
    // tiddlybase extensions used by PatchedModules
    // modules define()'d before PatchModules is installed
    // will not have a requires field, so it's type is optional.
    requires?: Set<string>
  }

  export type Syncer = {
    // TODO: lots of methods missing
    tiddlerInfo: Record<string, {
      adaptorInfo: SyncAdaptorTiddlerInfo,
      revision?: string,
      changeCount: number
    }>
  } // defined in core/modules/syncer.js

  export type ClassConstructor = (new () => any);

  export interface TW5Modules {
    titles: Record<string, TW5Module>;
    types: Partial<Record<ModuleType, Record<string, TW5Module>>>
    define: (moduleName: string, moduleType: ModuleType, definition: string | ModuleExports) => void;
    execute: (moduleName: string, moduleRoot?: string) => ModuleExports;
    applyMethods: (moduleType: ModuleType, targetObject?: any) => any;
    createClassFromModule: (moduleExports: ModuleExports, baseClass: ClassConstructor) => any;
    createClassesFromModules: (moduleType: ModuleType, subType: string, baseClass: ClassConstructor) => any;
    forEachModuleOfType: (moduleType: ModuleType, callback: (title: string, exports: ModuleExports) => void) => any;
    getModulesByTypeAsHashmap: (moduleType: any, nameField: any) => any;
  }

  export namespace utils {
    // defined in tiddlywiki/core/modules/utils/dom/http.js
    export const httpRequest: (
      options: Partial<{
        type: HTTPMethod;
        url: string;
        headers: Record<string, string>;
        data: string;
        callback: Callback;
      }>,
    ) => void;
    export class Logger {
      constructor(loggerName?: string);
      setSaveBuffer: (buffer: any) => void;
      log: (message: string, ...data: any[]) => void;
    }
    export const error: (message: string) => void;
    export const domMaker: (tag: string, options: DomMakerOptions) => HTMLElement;
    export const formatDateString: (date: Date, format: string) => string;
    export let getLocationPath: () => string;
    export const resolvePath: (sourcepath: string, rootpath?: string) => string;
    export const copyToClipboard: (text: string, options?: {doNotNotify?: boolean}) => void;
    export const stringifyList: (list: string[]) => string;
    export const getScrollPosition: () => {x: number, y: number};
  }

  export namespace boot {
    export let argv: undefined | string[];
    export const boot: (callback?: () => any) => void;
    export const wikiInfo: undefined | {
      config: Partial<WikiInfoConfig>;
    }
    export let suppressBoot: boolean;
  }
  export const wiki: Wiki;
  export const preloadTiddlerArray: (tiddlerFields: TiddlerFields[]) => void;
  export const language: undefined | Translator;
  export namespace hooks {

    export const addHook: <K extends AddHookArguments[0]>(hookName: K, handler: ValueFor<AddHookArguments, K>) => void;
    export const invokeHook: <K extends AddHookArguments[0]>(hookName: K, ...hookArgs: Parameters<ValueFor<AddHookArguments, K>>) => ReturnType<ValueFor<AddHookArguments, K>>;
  }
  export const browser: undefined | {
    isIE: boolean,
    isFirefox: boolean
  };
  export const platform: undefined | {
    isMac: boolean,
    isWindows: boolean,
    isLinux: boolean
  };
  export const node: unknown;
  export const desktop: undefined | {
    gui: unknown;
    utils: unknown;
  };
  export const rootWidget: Widget;
  export let modules: TW5Modules;
  export let config: {
    pluginsPath: string,
    themesPath: string,
    languagesPath: string,
    editionsPath: string,
    wikiInfo: string,
    wikiPluginsSubDir: string,
    wikiThemesSubDir: string,
    wikiLanguagesSubDir: string,
    wikiTiddlersSubDir: string,
    wikiOutputSubDir: string,
    jsModuleHeaderRegExpString: string,
    fileExtensionInfo: any,
    contentTypeInfo: any,
    pluginsEnvVar: string,
    themesEnvVar: string,
    languagesEnvVar: string,
    editionsEnvVar: string
  }
  export const syncer: Syncer;
}

