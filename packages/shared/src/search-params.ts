export type ParsedSearchParams = Record<string, string>;

export const parseSearchParams = (rawSearchParams:string):ParsedSearchParams => Object.fromEntries((new URLSearchParams(window.location.search)).entries());
