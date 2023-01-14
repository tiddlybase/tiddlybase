import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import type {} from "@tiddlybase/tw5-types/src/index";

import { Calendar, CalendarAppProps } from "./Calendar";
import { DateRange, getDefaultLocalizer } from "./localizer";
import endOfDay from "date-fns/endOfDay";
import startOfDay from "date-fns/startOfDay";
import { eventStore, getEventMapper, RequireAsync, TiddlerWithModuleEvent } from "./tiddler-events";

export type CalendarProps = Omit<
  CalendarAppProps<TiddlerWithModuleEvent>,
  "getEventsInRange" | "localizer"
>;

export const getCalendarComponent = (
  requireAsync: RequireAsync,
  tw: typeof $tw = globalThis.$tw
) => {
  const mapper = getEventMapper(requireAsync, tw);
  const localizer = getDefaultLocalizer();
  const getEventsInRange = async (
    dateRange: DateRange
  ): Promise<TiddlerWithModuleEvent[]> => {
    if ("start" in dateRange) {
      return await eventStore.getEventsInRange(
        dateRange.start,
        dateRange.end,
        mapper
      );
    }
    // get events for each day in DateRange
    return (
      await Promise.all(
        dateRange.map((date) =>
          eventStore.getEventsInRange(startOfDay(date), endOfDay(date), mapper)
        )
      )
    ).flat();
  };
  return (props: CalendarProps) => Calendar({ ...props, localizer, getEventsInRange });
};
