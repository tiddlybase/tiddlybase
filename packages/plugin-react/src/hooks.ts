import { useReducer, useCallback, useState, useEffect } from "react";
import type { } from "@tiddlybase/tw5-types/src/index"
import {merge} from "@tiddlybase/plugin-tiddlybase-utils/src/lodash";

export const DEFAULT_IGNORE_TEST = (title: string) => title.startsWith('$:/') || title.startsWith('Draft of ')

interface UseFilterState {
  result: string[],
  query: string
}

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

export const useFilter = (query: string, ignoreTest = DEFAULT_IGNORE_TEST) => {
  const [filterState, dispatch] = useReducer(
    (state: UseFilterState, newQuery: string | undefined) => {
      const effectiveQuery = newQuery ?? state.query;
      const newResult = $tw.wiki.filterTiddlers(effectiveQuery);
      return {
        query: effectiveQuery,
        result: arraysEqual(state.result, newResult) ? state.result : newResult
      };
    },
    { query, result: [] } as UseFilterState
  );
  useEffect(() => {
    const changeListener = (changes: $tw.WikiChange) => {
      if (Object.keys(changes).every(ignoreTest)) {
        // ignore update completely because none of the affected tiddlers matter
        return;
      }
      dispatch(undefined)
    }
    $tw.wiki.addEventListener("change", changeListener);
    return () => {
      // console.log("useFilter cleanup removing wiki event listener");
      $tw.wiki.removeEventListener("change", changeListener);
    };
  }, []);
  useEffect(() => { dispatch(query); }, [query]);
  // useEffect(() => { console.log("useFilter filterResult changed"); }, [filterResult]);
  return filterState.result;
};

type TiddlerReducerFn<A> = (prevState: $tw.TiddlerFields, action: A) => $tw.TiddlerFields;

export const reducerReplace: TiddlerReducerFn<$tw.TiddlerFields> = (prevState: $tw.TiddlerFields, newState: $tw.TiddlerFields): $tw.TiddlerFields => ({ ...newState, title: prevState.title });

export const reducerMerge: TiddlerReducerFn<Partial<$tw.TiddlerFields>> = (prevState: $tw.TiddlerFields, newState: Partial<$tw.TiddlerFields>): $tw.TiddlerFields => merge([{}, prevState, newState, { title: prevState.title }]);

const getTiddlerFields = (title: string): $tw.TiddlerFields | undefined => $tw.wiki.getTiddler(title)?.fields;

export const useTiddlerReducer = <A extends Partial<$tw.TiddlerFields>>(title: string, reducer: TiddlerReducerFn<A> = reducerMerge):[$tw.TiddlerFields | undefined, (action: A) => void] => {
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
