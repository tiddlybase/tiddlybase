
export const extractColorName = (s:string):string|undefined => s.match(/^<<colour ([\S]+)>>$/)?.[1]

// get paletteText with eg:
// $tw.wiki.getTiddler($tw.wiki.getTiddler('$:/palette').fields.text).fields.text
export const parseTW5Palette = (paletteText:string): Record<string, string> => {
  const pairs = paletteText.split("\n").map(l => l.split(":").map(s => s.trim()))
  return pairs.reduce((acc, [k, v]) => {
    if (v) {
      const colorName = extractColorName(v);
      if (typeof colorName === 'string') {
        Object.defineProperty(acc, k, {
          get: () => acc[colorName],
          enumerable: true
        })
      } else {
        acc[k] = v;
      }
    }
    return acc;
  }, {} as Record<string, string>);
}
