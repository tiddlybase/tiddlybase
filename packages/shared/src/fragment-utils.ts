export const fragmentNameToURLHash = (fragment: string, octothorpe=true) => `${octothorpe ? '#' : ''}${encodeURIComponent(fragment)}`
export const urlHashToFragmentName = (urlHash: string) => {
  const start = urlHash.startsWith("#") ? 1 : 0
  return decodeURIComponent(urlHash.substring(start))
}
