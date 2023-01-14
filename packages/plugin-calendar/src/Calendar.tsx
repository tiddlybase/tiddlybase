import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Calendar as RBC,
  CalendarProps,
  Culture,
  Event as CalendarEvent,
  View
} from "react-big-calendar";
import withDragAndDrop, {
  withDragAndDropProps,
} from "react-big-calendar/lib/addons/dragAndDrop";
import {
  ExtendedDateLocalizer,
  getDefaultLocalizer,
  getInitialRange,
  DateRange,
} from "./localizer";
import { TiddlerCalendarEvent } from "./TiddlerCalendarEvent";

type OnRangeChange = Exclude<
  CalendarProps<CalendarEvent, object>["onRangeChange"],
  undefined
>;

export type CalProps<
  TEvent extends TiddlerCalendarEvent,
  TResource extends object = object
> = Omit<
  withDragAndDropProps<TEvent, TResource> & CalendarProps<TEvent, TResource>,
  "localizer" | "onRangeChange" | "defaultView" | "defaultDate"
>;

type MaybeEventList<TEvent extends TiddlerCalendarEvent> =
  | { events: TEvent[] }
  | { error: string }
  | { loading: true };

export type CalendarAppProps<TEvent extends TiddlerCalendarEvent> = {
  calProps?: CalProps<TEvent>;
  localizer?: ExtendedDateLocalizer;
  culture: Culture;
  view: View;
  date: Date;
  getEventsInRange: (
    dateRange: DateRange
  ) => TEvent[] | Promise<TEvent[]>;
};

export const Calendar = <TEvent extends TiddlerCalendarEvent>({
  calProps,
  culture,
  localizer: _localizer,
  view: _view,
  date: _date,
  getEventsInRange,
}: CalendarAppProps<TEvent>) => {
  const localizer = useMemo<ExtendedDateLocalizer>(
    () => _localizer ?? getDefaultLocalizer(),
    [_localizer]
  );
  // start with empty event list until the first getEventsInRange completes
  const [date, setDate] = useState<Date>(_date);
  const [view, setView] = useState<View>(_view);
  const [eventList, setEventList] = useState<MaybeEventList<TEvent>>({ loading: true });
  const updateEventList = async (newRange: DateRange) => {
    // Upon first render, get initial list of events
    // const initialRange = getInitialRange(culture, localizer, defaultView, startDate);
    try {
      const events = await getEventsInRange(newRange);
      console.log("getEventsInRange returned", events);
      setEventList({events});
    } catch (e) {
      setEventList({error: (e as Error).message})
    }
  };

  // useEffect ensures this action is only run on first render
  useEffect(() => {
    const initialRange = getInitialRange(culture, localizer, view, date);
    console.log("Calendar initial range", date, view, initialRange);
    updateEventList(initialRange);
  }, []);

  const onNavigate = useCallback<Exclude<CalProps<TEvent>["onNavigate"], undefined>>((newDate) => setDate(newDate), []);

  const onRangeChange = useCallback<OnRangeChange>(
    (newRange: DateRange) => {
      setEventList({ loading: true });
      updateEventList(newRange);
    },
    [getEventsInRange]
  );
  if ('loading' in eventList) {
    return (<>Loading calendar view...</>);
  }
  if ('error' in eventList) {
    return (<>Error loading calendar view: {eventList.error}</>)
  }
  //@ts-ignore
  const DnDCalendar = withDragAndDrop(RBC<TEvent, object>);
  return (
    <DnDCalendar
      {...{
        ...calProps,
        culture,
        defaultView: view,
        defaultDate: date,
        events: eventList.events,
        localizer,
        onRangeChange,
        onNavigate,
        onView: setView,
      }}
    />
  );
};
