import { ReactNode, useMemo } from "react";
import { useTiddlerReducer } from "@tiddlybase/plugin-react/src/hooks";
import { ThemeProvider, createTheme, ThemeOptions } from "@mui/material";
import { convertTW5ToMuiPalette, parseTW5Palette } from "./palettereader";
import { merge } from "@tiddlybase/plugin-tiddlybase-utils/src/lodash";

export interface TW5ThemeProviderProps {
  children: ReactNode;
  overrides?: ThemeOptions;
}

export const DEFAULT_THEME_TITLE = "$:/palettes/Vanilla";
export const THEME_SELECTOR_TIDDLER_TITLE = "$:/palette";

export const TW5ThemeProvider = ({
  children,
  overrides,
}: TW5ThemeProviderProps) => {
  const [themeTiddler] = useTiddlerReducer(THEME_SELECTOR_TIDDLER_TITLE);
  const [themeDefinition] = useTiddlerReducer(
    themeTiddler?.text ?? DEFAULT_THEME_TITLE
  );
  const theme = useMemo(() => {
    const parsedThemeDefinition = parseTW5Palette(themeDefinition?.text ?? "");
    const muiThemeOptions = convertTW5ToMuiPalette(parsedThemeDefinition);
    const effectiveThemeOptions = merge([muiThemeOptions, overrides ?? {}]);
    return createTheme(effectiveThemeOptions);
  }, [overrides, themeTiddler, themeDefinition]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
