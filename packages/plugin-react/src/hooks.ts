import { useReducer, useCallback, useState, useEffect } from "react";
import type { } from "@tiddlybase/tw5-types/src/index"
import { merge } from "@tiddlybase/plugin-tiddlybase-utils/src/lodash";

export const DEFAULT_IGNORE_TEST = (title: string) => title.startsWith('Draft of ')

interface UseFilterState {
  resultTitles: string[],
  resultTiddlers: Array<$tw.TiddlerFields|undefined>,
  query: string
}

type UseFilterOptions = Partial<{
  ignoreTest: typeof DEFAULT_IGNORE_TEST;
  titlesOnly: boolean;
  wiki: $tw.Wiki,
}>

export const arraysEqual = (array1: string[], array2: string[]) => {
  if (array1.length != array2.length) {
    return false;
  }
  const sorted1 = [...array1];
  const sorted2 = [...array2];
  sorted1.sort();
  sorted2.sort();
  return sorted1.every((element, index) => element === sorted2[index]);
}

export const arraysIntersect = (array1: string[], array2: string[]) => array1.filter(x => array2.includes(x)).length > 0;

type UseFilterAction = {newQuery: string} | {wikiChange: $tw.WikiChange};

export const useFilter = (
  query: string,
  {
    ignoreTest = DEFAULT_IGNORE_TEST,
    titlesOnly = false,
    wiki = $tw.wiki
  }: UseFilterOptions = {}) => {
  const [filterState, dispatch] = useReducer(
    (state: UseFilterState, action: UseFilterAction) => {
      let effectiveQuery = state.query;
      if ('newQuery' in action) {
        effectiveQuery = action.newQuery;
      }
      // Regardless of whether the query or the wiki changed, the
      // results may be different, so run filterTiddlers either way.
      const newResultTitles = wiki.filterTiddlers(effectiveQuery);
      let resultTitles = state.resultTitles;
      let resultTiddlers = state.resultTiddlers;
      // Recompute results if EITHER
      // * The set of result tiddlers has changed OR
      // * Any of the tiddlers changed within the otherwise unchanged set of titles
      let changedTiddlerTitles = 'wikiChange' in action ? Object.keys(action.wikiChange) : [];
      if (!arraysEqual(state.resultTitles, newResultTitles) || arraysIntersect(changedTiddlerTitles, newResultTitles)) {
        resultTitles = newResultTitles;
        if (!titlesOnly) {
          resultTiddlers = resultTitles.map(title => wiki.getTiddler(title)?.fields);
        }
      }
      return {
        query: effectiveQuery,
        resultTitles,
        resultTiddlers
      };
    },
    { query, resultTitles: [], resultTiddlers: [] } as UseFilterState
  );
  useEffect(() => {
    const changeListener = (changes: $tw.WikiChange) => {
      if (Object.keys(changes).every(ignoreTest)) {
        // ignore update completely because none of the affected tiddlers matter
        return;
      }
      dispatch({wikiChange: changes})
    }
    wiki.addEventListener("change", changeListener);
    return () => {
      // console.log("useFilter cleanup removing wiki event listener");
      wiki.removeEventListener("change", changeListener);
    };
  }, []);
  useEffect(() => { dispatch({newQuery: query}); }, [query, titlesOnly, wiki]);
  // useEffect(() => { console.log("useFilter filterResult changed"); }, [filterResult]);
  return titlesOnly ? filterState.resultTitles : filterState.resultTiddlers;
};

type TiddlerReducerFn<A> = (prevState: $tw.TiddlerFields, action: A) => $tw.TiddlerFields;

export const reducerReplace: TiddlerReducerFn<$tw.TiddlerFields> = (prevState: $tw.TiddlerFields, newState: $tw.TiddlerFields): $tw.TiddlerFields => ({ ...newState, title: prevState.title });

export const reducerMerge: TiddlerReducerFn<Partial<$tw.TiddlerFields>> = (prevState: $tw.TiddlerFields, newState: Partial<$tw.TiddlerFields>): $tw.TiddlerFields => merge([{}, prevState, newState, { title: prevState.title }]);

const getTiddlerFields = (title: string): $tw.TiddlerFields | undefined => $tw.wiki.getTiddler(title)?.fields;

export const useTiddlerReducer = <A extends Partial<$tw.TiddlerFields>>(title: string, reducer: TiddlerReducerFn<A> = reducerMerge): [$tw.TiddlerFields | undefined, (action: A) => void] => {
  // based on: https://medium.com/@manojsinghnegi/react-custom-hooks-lets-implement-our-own-usereducer-fb166ca9dd96
  // set the initial state to the tiddler fields so that the hook returns correct state even before the first useEffect run
  const [state, setState] = useState(getTiddlerFields(title));
  const dispatch = useCallback((action: A) => {
    const nextState = reducer(state ?? { title }, action);
    $tw.wiki.addTiddler(nextState);
  }, [title, state, setState, reducer]);
  useEffect(() => {
    // reload the state tiddler if the title changes
    setState(getTiddlerFields(title));
    const changeListener = (changes: $tw.WikiChange) => {
      if ((changes[title]?.modified === true) || (changes[title]?.deleted === true)) {
        // the tiddler has changed, so update the state variable accordingly
        const newTiddlerFields = $tw.wiki.getTiddler(title)?.fields;
        setState(oldTiddlerFields => {
          return oldTiddlerFields !== newTiddlerFields ? newTiddlerFields : oldTiddlerFields;
        });
      }
    };
    $tw.wiki.addEventListener("change", changeListener);
    // cleanup removes the event listener
    return () => $tw.wiki.removeEventListener("change", changeListener);
  }, [title, reducer]);
  return [state, dispatch];
};
