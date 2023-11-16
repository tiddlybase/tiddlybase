import { SearchVariables } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { TIDDLYBASE_TITLE_TIDDLER_ARGUMENTS } from "./constants";
/**
 * Tiddlers may store their state in $:/state/persisted-state/${TIDDLERNAME}
 * The
 */
export type TiddlerArguments = SearchVariables;

export const TIDDLER_ARGUMENTS_FIELDNAME = "tiddler-arguments";

export const getTiddlerArgumentsTitle = (title: string):string => `${TIDDLYBASE_TITLE_TIDDLER_ARGUMENTS}${title}`

export interface ScrollPosition {
  x: number;
  y: number;
}

export interface TiddlerViewState {
  title: string;
  folded?: boolean;
  // An optional dictionary holding persistable tiddler state which
  // will be serialized into permalink / permaview / history navigation
  tiddlerArguments?: TiddlerArguments
}
/**
 * Represents the entire visual state of the Wiki -barring the state of the individual tiddlers
 */
export interface WikiViewState {
  sidebar?: boolean;
  activeTiddler?: string;
  openTiddlers: TiddlerViewState[];
  scrollPosition?: ScrollPosition;
}
