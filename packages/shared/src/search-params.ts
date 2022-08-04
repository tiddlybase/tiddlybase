import { DEFAULT_BUILD_NAME, DEFAULT_WIKI_NAME, SEARCH_PARAM_BUILD, SEARCH_PARAM_LOCAL, SEARCH_PARAM_WIKI } from "./constants";

export type ParsedSearchParams = Record<string, string>;

export const parseSearchParams = (rawSearchParams:string):ParsedSearchParams => Object.fromEntries((new URLSearchParams(window.location.search)).entries());

export const isLocal = (searchParams?: ParsedSearchParams) => (searchParams ?? {})[SEARCH_PARAM_LOCAL] === 'true';
export const getBuild = (searchParams?: ParsedSearchParams) => (searchParams ?? {})[SEARCH_PARAM_BUILD] ?? DEFAULT_BUILD_NAME;
export const getWikiName = (searchParams?: ParsedSearchParams) => (searchParams ?? {})[SEARCH_PARAM_WIKI] ?? DEFAULT_WIKI_NAME;
