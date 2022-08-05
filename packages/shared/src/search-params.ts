import { SEARCH_PARAM_LOCAL } from "./constants";

export type ParsedSearchParams = Record<string, string>;

export const parseSearchParams = (rawSearchParams:string):ParsedSearchParams => Object.fromEntries((new URLSearchParams(window.location.search)).entries());

export const isLocal = (searchParams?: ParsedSearchParams) => (searchParams ?? {})[SEARCH_PARAM_LOCAL] === 'true';
