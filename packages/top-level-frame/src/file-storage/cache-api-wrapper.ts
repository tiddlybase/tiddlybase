export type ResponseLike = string | Blob | Response;
export type CachedResponseLikeResolver = () => Promise<ResponseLike>;

export const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // default TTL is one week

export const asResponseWithExpiration = async (responseLike: ResponseLike, expiration: Date): Promise<Response> => {
  let status = 200;
  let statusText = undefined;
  let headers: [string, string][] = [['Expires', formatHttpDate(expiration)]]
  let blob: Blob | undefined = undefined;
  if (responseLike instanceof Response) {
    status = responseLike.status;
    statusText = responseLike.statusText;
    headers = [
      ...headers,
      ...([...responseLike.headers].filter(([key, _value]) => key.toLowerCase() != 'expires'))
    ]
    blob = await responseLike.clone().blob()
  } else {
    blob = (responseLike instanceof Blob) ? responseLike : new Blob([responseLike], { type: 'plain/text' });
    headers.push(['content-length', String(blob.size)])
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#examples
  return new Response(
    blob,
    { status, statusText, headers }
  )
}

const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

// https://stackoverflow.com/a/74508181/22709529
const formatHttpDate = (date: Date): string => date.toLocaleString('en-GB', {
  timeZone: 'UTC',
  hour12: false,
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).replace(/(?:(\d),)/, '$1') + ' GMT';

// https://stackoverflow.com/a/30421037/22709529
const parseHttpDate = (strDate: string): Date => new Date(strDate)

const dateHasPassed = (date: Date): boolean => date.getTime() < (new Date().getTime());

// https://developer.mozilla.org/en-US/docs/Web/API/Cache/put
export class CacheAPIWrapper {
  private _cache: Promise<Cache>;
  constructor(
    private instance: string,
    private _caches = self.caches
  ) {
    this._cache = this._caches.open(this.getCacheName())
  }

  private getCacheName(): string {
    return `tiddlybase-cache-${this.instance}`;
  }

  async put(url: string, response: ResponseLike, ttl = DEFAULT_TTL_SECONDS): Promise<Response> {
    const effectiveResponse = await asResponseWithExpiration(response, addSeconds(new Date(), ttl));
    await (await this._cache).put(new URL(url), effectiveResponse.clone());
    return effectiveResponse
  }

  async get(url: string): Promise<Response | undefined> {
    const cachedResponse = await (await this._cache).match(new URL(url), {
      'ignoreSearch': false,
      'ignoreMethod': false,
      'ignoreVary': false
    })
    const expiration = cachedResponse?.headers.get('expires')
    if (!!expiration && dateHasPassed(parseHttpDate(expiration))) {
      return undefined
    }
    return cachedResponse?.clone();
  }

  async resolve(url: string, resolver?: CachedResponseLikeResolver, ttl = DEFAULT_TTL_SECONDS): Promise<Response> {
    try {
      const cachedResponse = await this.get(url);
      if (cachedResponse) {
        return cachedResponse;
      }
      const responseLike = await (resolver ? resolver() : fetch(url));
      return this.put(url, responseLike, ttl)
    } catch(e) {
      console.log("cache resolve exception", e);
      throw e;
    }
  }
}
