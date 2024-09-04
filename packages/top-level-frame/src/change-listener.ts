import { TIDDLYBASE_LOCAL_STATE_PREFIX } from "@tiddlybase/shared/src/constants";
import { TiddlerStorageChangeListener, TiddlerProvenance } from "@tiddlybase/shared/src/tiddler-storage";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { APIClient } from "@tiddlybase/rpc/src/types";

export class ProxyToSandboxedIframeChangeListener implements TiddlerStorageChangeListener {

  constructor(private sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>) { }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    this.sandboxedAPIClient('onSetTiddler', [tiddler]);
  }

  onDeleteTiddler(title: string): void {
    this.sandboxedAPIClient('onDeleteTiddler', [title]);
  }
}

export class ProvenanceUpdatingChangeListenerWrapper implements TiddlerStorageChangeListener {
  constructor(
    private wrappedListener: TiddlerStorageChangeListener,
    private sourceIndex: number,
    private tiddlerProvenance: TiddlerProvenance
  ) { }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    if (!(tiddler.title in this.tiddlerProvenance)
      || this.tiddlerProvenance[tiddler.title] == this.sourceIndex
    ) {
      this.tiddlerProvenance[tiddler.title] = this.sourceIndex;
      this.wrappedListener.onSetTiddler(tiddler);
    } else {
      console.log(`Ignoring update to ${tiddler.title} from source ${this.sourceIndex} since provenance is from ${this.tiddlerProvenance[tiddler.title]}`);
    }

  }
  onDeleteTiddler(title: string): void {
    if (this.tiddlerProvenance?.[title] === this.sourceIndex) {
      delete this.tiddlerProvenance[title];
      this.wrappedListener.onDeleteTiddler(title);
    } else {
      console.log(`Ignoring deletion of ${title} from source ${this.sourceIndex} since provenance is from ${this.tiddlerProvenance[title]}`)
    }

  }
}

export class OptionallyEnabledChangeListenerWrapper implements TiddlerStorageChangeListener {
  constructor(
    private wrappedListener: TiddlerStorageChangeListener,
    private _enabled = false) { }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    if (!this._enabled) {
      console.log("Ignoring set tiddler, as change listener is not enabled");
      return;
    }
    this.wrappedListener.onSetTiddler(tiddler);
  }
  onDeleteTiddler(title: string): void {
    if (!this._enabled) {
      console.log("Ignoring delete tiddler, as change listener is not enabled");
      return;
    }
    this.wrappedListener.onDeleteTiddler(title);
  }

  enable(enabledValue: boolean) {
    this._enabled = enabledValue;
  }
}

export class FilteringChangeListenerWrapper implements TiddlerStorageChangeListener {

  constructor(
    private wrappedListener: TiddlerStorageChangeListener,
    private setFilter?: (tiddler: $tw.TiddlerFields) => boolean,
    private deleteFilter?: (title: string) => boolean) { }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    if (!this.setFilter || this.setFilter(tiddler)) {
      this.wrappedListener.onSetTiddler(tiddler);
    }
  }
  onDeleteTiddler(title: string): void {
    if (!this.deleteFilter || this.deleteFilter(title)) {
      this.wrappedListener.onDeleteTiddler(title);
    }
  }
}

export const makeFilteringChangeListener = (changeListener: TiddlerStorageChangeListener) => new FilteringChangeListenerWrapper(
  changeListener,
  tiddler => {
    if (tiddler.title.startsWith(TIDDLYBASE_LOCAL_STATE_PREFIX)) {
      console.log(`Ignoring set tiddler to tiddler ${tiddler.title} due to TIDDLYBASE_LOCAL_STATE_PREFIX title prefix`, tiddler)
      return false;
    }
    return true;
  },
  title => {
    if (title.startsWith(TIDDLYBASE_LOCAL_STATE_PREFIX)) {
      console.log(`Ignoring delete tiddler ${title} due to TIDDLYBASE_LOCAL_STATE_PREFIX title prefix`)
      return false;
    }
    return true;
  }
);

export const makeChangeListener = (
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>
) => new OptionallyEnabledChangeListenerWrapper(
  new ProxyToSandboxedIframeChangeListener(sandboxedAPIClient));
