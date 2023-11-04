declare namespace $tw {
  export namespace Widget {
    export type MessageType =
      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-add-field.html
      | 'tm-add-field'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-add-tag.html
      | 'tm-add-tag'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-auto-save-wiki.html
      | 'tm-auto-save-wiki'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-browser-refresh.html
      | 'tm-browser-refresh'

      // TODO
      | 'tm-clear-browser-storage'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-cancel-tiddler.html
      | 'tm-cancel-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-clear-password.html
      | 'tm-clear-password'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-close-all-tiddlers.html
      | 'tm-close-all-tiddlers'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-close-all-windows.html
      | 'tm-close-all-windows'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-close-other-tiddlers.html
      | 'tm-close-other-tiddlers'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-close-tiddler.html
      | 'tm-close-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-close-window.html
      | 'tm-close-window'

      // TODO
      | 'tm-consent-accept'
      | 'tm-consent-clear'
      | 'tm-consent-decline'

      // TODO
      | 'tm-copy-syncer-logs-to-clipboard'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-copy-to-clipboard.html
      | 'tm-copy-to-clipboard'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-delete-tiddler.html
      | 'tm-delete-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-download-file.html
      | 'tm-download-file'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-edit-bitmap-operation.html
      | 'tm-edit-bitmap-operation'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-edit-text-operation.html
      | 'tm-edit-text-operation'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-edit-tiddler.html
      | 'tm-edit-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-focus-selector.html
      | 'tm-focus-selector'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-fold-all-tiddlers.html
      | 'tm-fold-all-tiddlers'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-fold-other-tiddlers.html
      | 'tm-fold-other-tiddlers'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-fold-tiddler.html
      | 'tm-fold-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-full-screen.html
      | 'tm-full-screen'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-home.html
      | 'tm-home'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-import-tiddlers.html
      | 'tm-import-tiddlers'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-load-plugin-from-library.html
      | 'tm-load-plugin-from-library'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-load-plugin-library.html
      | 'tm-load-plugin-library'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-login.html
      | 'tm-login'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-logout.html
      | 'tm-logout'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-modal.html
      | 'tm-modal'

      // TODO
      | 'tm-navigate'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-notify.html
      | 'tm-notify'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-open-external-window.html
      | 'tm-open-external-window'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-open-window.html
      | 'tm-open-window'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-perform-import.html
      | 'tm-perform-import'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-permalink.html
      | 'tm-permalink'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-permaview.html
      | 'tm-permaview'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-print.html
      | 'tm-print'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-relink-tiddler.html
      | 'tm-relink-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-remove-field.html
      | 'tm-remove-field'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-remove-tag.html
      | 'tm-remove-tag'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-rename-tiddler.html
      | 'tm-rename-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-save-tiddler.html
      | 'tm-save-tiddler'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-save-wiki.html
      | 'tm-save-wiki'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-scroll.html
      | 'tm-scroll'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-server-refresh.html
      | 'tm-server-refresh'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-set-password.html
      | 'tm-set-password'

      // TODO
      | 'tm-show-switcher'

      // TODO
      | 'tm-slice-tiddler'

      // https://github.com/Jermolene/TiddlyWiki5/blob/775c7f00746a5c4d83babdec81e59f4aea3c2e04/plugins/tiddlywiki/jszip/docs.tid
      | 'tm-zip-add-text-file'
      | 'tm-zip-create'
      | 'tm-zip-download'
      | 'tm-zip-render-file'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-unfold-all-tiddlers.html
      | 'tm-unfold-all-tiddlers'

      // https://tiddlywiki.com/static/WidgetMessage%253A%2520tm-unload-plugin-library.html
      | 'tm-unload-plugin-library'
      ;

    export interface TW5EventBase {
      type: MessageType;
      // keyboard modifiers set when event fired
      metaKey?: boolean,
      ctrlKey?: boolean,
      altKey?: boolean,
      shiftKey?: boolean,
      // DOM event triggering Widget event (if any)
      event?: Event,
    }

    export interface NavigateEvent extends TW5EventBase {
      type: 'tm-navigate';
      navigateTo: string;
      navigateFromTitle?: string;
      navigateFromNode?: Node,
      navigateSuppressNavigation?: boolean
      navigateFromClientRect?: {
        top: number,
        left: number,
        width: number,
        right: number,
        bottom: number,
        height: number,
      },
      navigateFromClientTop?: number,
      navigateFromClientLeft?: number,
      navigateFromClientWidth?: number,
      navigateFromClientRight?: number,
      navigateFromClientBottom?: number,
      navigateFromClientHeight?: number,
    }

    export interface CloseTiddlerEvent extends TW5EventBase {
      type: 'tm-close-tiddler';
      tiddlerTitle: string;
    }

    export interface CloseAllTiddlersEvent extends TW5EventBase {
      type: 'tm-close-all-tiddlers';
    }

    export interface CloseOtherTiddlersEvent extends TW5EventBase {
      type: 'tm-close-other-tiddlers';
      tiddlerTitle: string;
    }

    export interface OpenModalEvent extends TW5EventBase {
      type: 'tm-modal';
      param: string; // tiddler title
      paramObject: any; // dictionary of variables
    }

    export interface OpenExternalWindowEvent extends TW5EventBase {
      type: 'tm-open-external-window';
      param: string; // tiddler title
      paramObject: {
        windowName?: string;
        windowFeatures?: string
      }; // dictionary of variables
    }

    export interface PermalinkEvent extends TW5EventBase {
      type: "tm-permalink";
      param?: string; // tiddler title
      tiddlerTitle: string;
    }

    export interface PermaviewEvent extends TW5EventBase {
      type: "tm-permaview";
      param?: string; // tiddler title
      tiddlerTitle: string;
    }

    export type WidgetEvent =
      | NavigateEvent
      | CloseTiddlerEvent
      | CloseAllTiddlersEvent
      | CloseOtherTiddlersEvent
      | OpenModalEvent
      | OpenExternalWindowEvent
      | PermalinkEvent
      | PermaviewEvent
      | { type: 'tm-browser-refresh' }
      | { type: 'tm-print' }
      | { type: 'tm-home' }

  }
}

