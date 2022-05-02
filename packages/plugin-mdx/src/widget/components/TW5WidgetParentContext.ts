import React from "react";
import type { Widget } from '@tiddlybase/tw5-types';

export const TW5WidgetParentContext = React.createContext<Widget|undefined>(undefined);
