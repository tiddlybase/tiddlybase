import { SearchVariables } from "./path-template-utils";
/**
 * Tiddlers may store their state in $:/state/persisted-state/${TIDDLERNAME}
 * The
 */
export type PersistedState = SearchVariables;
export const PERSISTED_STATE_FIELDNAME = "state";

export interface ScrollPosition {
  x: number;
  y: number;
}

export interface TiddlerViewState {
  title: string;
  folded?: boolean;
  // An optional dictionary holding persistable tiddler state which
  // will be serialized into permalink / permaview / history navigation
  persistedState?: PersistedState
}
/**
 * Represents the entire visual state of the Wiki -barring the state of the individual tiddlers
 */
export interface WikiViewState {
  sidebar: boolean;
  activeTiddler?: string;
  openTiddlers: TiddlerViewState[];
  scrollPosition: ScrollPosition;
}
