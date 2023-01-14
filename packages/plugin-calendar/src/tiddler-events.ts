import { EventMapper, EventStore } from "./event-store";
import { TiddlerCalendarEvent } from "./TiddlerCalendarEvent";

export type TiddlerWithModuleEvent = TiddlerCalendarEvent & {
  module?: $tw.ModuleExports;
};

export type RequireAsync = (
  requiredModuleName: string
) => Promise<$tw.ModuleExports>;

export const getEventMapper =
  (
    requireAsync: RequireAsync,
    tw: typeof $tw = globalThis.$tw
  ): EventMapper<TiddlerWithModuleEvent> =>
  async (calendarEvent: TiddlerCalendarEvent) => {
    // from: https://bobbyhadz.com/blog/javascript-create-date-from-day-month-year
    const title = calendarEvent.tiddler;
    const tiddler = tw.wiki.getTiddler(title);
    if (!tiddler) {
      throw new Error("tiddler not found: " + title);
    }

    return {
      ...calendarEvent,
      module:
        tiddler.fields.type === "text/x-markdown"
          ? await requireAsync(tiddler.fields.title)
          : undefined,
    };
  };

export const eventStore = new EventStore<TiddlerWithModuleEvent>(Intl.DateTimeFormat().resolvedOptions().timeZone);

export const CALENDAR_EVENT_TIDDLER_FILTER = '[all[shadows+tiddlers]has[event-date]][all[shadows+tiddlers]has[event-rrule]]-[has[draft.of]]';

// ms-to-sec * sec-to-min * min-to-hour * hour-to-day
const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

export const tiddlerToEvent = (tiddler?:$tw.Tiddler):Parameters<typeof eventStore["addEvent"]>|undefined  => {
  if (tiddler?.fields["event-date"]) {
	  // from: https://bobbyhadz.com/blog/javascript-create-date-from-day-month-year
	  const [year, month, day] = tiddler.fields["event-date"].split('-');
    // note: this creates a date in the local timezone, not UTC
	  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return [{
        tiddler: tiddler.fields.title,
        title: tiddler.fields["event-title"] ?? tiddler.fields.title,
        start: date,
        allDay: true
      }, undefined];
  } else if (tiddler?.fields["event-rrule"]) {
    const calendarEvent:TiddlerCalendarEvent = {
      tiddler: tiddler.fields.title,
      title: tiddler.fields["event-title"] ?? tiddler.fields.title,
    };
    if (tiddler.fields["event-duration"]) {
      const duration_ms = parseInt(tiddler.fields["event-duration"], 10);
      if (duration_ms === ONE_DAY_IN_MS) {
        calendarEvent.allDay = true;
      } else {
        calendarEvent.start = new Date(0);
        calendarEvent.end = new Date(duration_ms);
      }
    }
    return [calendarEvent, tiddler.fields["event-rrule"]];
  }
  return undefined;
};

export const subscribeEventStore = (eventStore:EventStore<TiddlerWithModuleEvent>, tw: typeof $tw = globalThis.$tw) => {
  // TODO: call this method from a startup js tiddler
  // query the wiki for all tiddlers with a 'date' field
  tw.wiki.filterTiddlers(CALENDAR_EVENT_TIDDLER_FILTER).forEach((tiddlerTitle: string) => {
    const tiddlerCalendarEvent = tiddlerToEvent($tw.wiki.getTiddler(tiddlerTitle))
    if (tiddlerCalendarEvent) {
      eventStore.addEvent(...tiddlerCalendarEvent);
    }
  })
  // subscribe to wiki changes and update the event store accordingly.
  const onChange:((wikiChange: $tw.WikiChange) => void) = (wikiChange: $tw.WikiChange) => {
    Object.entries(wikiChange).forEach(([tiddler, action]) => {
      if (action.deleted) {
        eventStore.removeEvent(tiddler);
      } else if (action.modified) {
        console.log(`TODO subscribeEventStore: tiddler ${tiddler} modified`);
      }
    })
  };
  tw.wiki.addEventListener("change", onChange);
  // return unsubscribe function
  return () => tw.wiki.removeEventListener("change", onChange);
}
