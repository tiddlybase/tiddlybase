import React from "react";
import { WidgetWithExternalChildren } from "./WidgetWithExternalChildren";

export const TW5WidgetParentContext = React.createContext<WidgetWithExternalChildren|null>(null);
