import type { TiddlerCollection } from "@tiddlybase/shared/src/tiddler-data-source";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import mustache from 'mustache'

export const DEFAULT_FIRESTORE_PATH_TEMPLATE = "tiddlybase-instances/{{instance}}/collections/{{collection}}/tiddlers"
export const DEFAULT_FIRESTORE_COLLECTION_NAMED = "shared"

export const evaluateMustacheTemplate = (template: string, variables: Record<string, any>): string => mustache.render(template, variables);

export const getFirestoreCollectionPath = (
  launchParameters: LaunchParameters,
  collection?: string,
  firestorePathTemplate: string = DEFAULT_FIRESTORE_PATH_TEMPLATE): string => evaluateMustacheTemplate(
    firestorePathTemplate, {
    ...uriEncodeLaunchParameters(launchParameters),
    collection: encodeURIComponent(collection ?? DEFAULT_FIRESTORE_COLLECTION_NAMED)
  });

export const mergeTiddlerArray = (tiddlers: $tw.TiddlerFields | $tw.TiddlerFields[]): TiddlerCollection => {
  if (Array.isArray(tiddlers)) {
    return tiddlers.reduce((coll, tiddler) => {
      coll[tiddler.title] = tiddler;
      return coll;
    }, {} as TiddlerCollection);
  }
  return { [tiddlers.title]: tiddlers };
};

export const fetchJSON = async (url: string): Promise<any> => await (await (fetch(url))).json();

export const uriEncodeLaunchParameters = (launchParameters: LaunchParameters): LaunchParameters => Object.fromEntries(
  Object.entries(launchParameters).map(([k, v]) => [k, typeof v === 'string' ? encodeURIComponent(v) : v])) as LaunchParameters;
