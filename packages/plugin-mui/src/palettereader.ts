import type { PaletteMode, ThemeOptions } from "@mui/material";

export const extractColorName = (s: string): string | undefined => s.match(/^<<colour ([\S]+)>>$/)?.[1]

// get paletteText with eg:
// $tw.wiki.getTiddler($tw.wiki.getTiddler('$:/palette').fields.text).fields.text
export const parseTW5Palette = (paletteText: string): Record<string, string> => {
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

const hexToDec = (hex: string): number => parseInt(hex, 16);
const doubleChar = (char: string): string => `${char}${char}`

const fullHexColorRegexp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const shortHexColorRegexp = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

// based on: https://stackoverflow.com/a/5624139
export const hexToRgb = (hex: string): number[] | undefined => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shortHandMatch = hex.match(shortHexColorRegexp);
  if (shortHandMatch) {
    return [
      hexToDec(doubleChar(shortHandMatch[1])),
      hexToDec(doubleChar(shortHandMatch[2])),
      hexToDec(doubleChar(shortHandMatch[3]))
    ];
  };

  var fullMatch = hex.match(fullHexColorRegexp);
  if (fullMatch) {
    return [
      hexToDec(fullMatch[1]),
      hexToDec(fullMatch[2]),
      hexToDec(fullMatch[3])
    ]
  }
  return undefined;
}


const MAX_COLOR_VECTOR_LENGTH = 441.7 // = Math.sqrt(3*255**2)

export const getPaletteMode = (backgroundColor: string): PaletteMode => {
  const colorVec = hexToRgb(backgroundColor);
  if (!colorVec) {
    return 'light' // default to light mode;
  }
  const vectorLength = Math.sqrt(colorVec[0] ** 2 + colorVec[1] ** 2 + colorVec[2] ** 2);
  return (vectorLength / MAX_COLOR_VECTOR_LENGTH) > 0.5 ? 'light' : 'dark';
}

export const convertTW5ToMuiPalette = (parsedThemeDefinition: Record<string, string>): ThemeOptions => {
  // TODO: there are more options we should set here!
  return {
    palette: {
      primary: {
        main: parsedThemeDefinition?.primary,
      },
      background: {
        default: parsedThemeDefinition?.background ?? 'transparent'
      },
      secondary: {
        main: parsedThemeDefinition?.foreground,
      },
      text: {
        primary: parsedThemeDefinition?.foreground,
        secondary: parsedThemeDefinition?.foreground,
      },
      mode: getPaletteMode(parsedThemeDefinition?.background ?? '')
    }
  }
}
