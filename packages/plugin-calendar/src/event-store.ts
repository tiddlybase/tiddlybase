import { RRuleSet } from 'rrule'
import { deserializeRuleSet } from './rrule-utils';
import { TiddlerCalendarEvent } from './TiddlerCalendarEvent';
import type {} from '@tiddlybase/tw5-types/src/index'

type TiddlerEvents = Array<[TiddlerCalendarEvent, RRuleSet|undefined]>;
export type EventMapper<TEvent extends TiddlerCalendarEvent> = (calendarEvent:TiddlerCalendarEvent)=>Promise<TEvent>;

const withinDateRange = (start: Date, end: Date, testedDate: Date):boolean => testedDate >= start && testedDate <= end;

export class EventStore<TEvent extends TiddlerCalendarEvent> {
  defaultEventDuration: number;
  tzid: string | undefined;
  tw: typeof $tw;
  tiddlerEvents: TiddlerEvents = [];

  constructor(tzid?: string, defaultEventDuration=1000*60*60, tw:typeof $tw=globalThis.$tw) {
    this.defaultEventDuration = defaultEventDuration;
    this.tzid = tzid;
    this.tw = tw;
  }

  addEvent(calendarEvent: TiddlerCalendarEvent, rruleSet?: RRuleSet|string) {
    if (rruleSet === undefined) {
      if (!calendarEvent.start) {
        throw new Error("Calendar event must include the start property if no rruleSet provided.")
      }
      this.tiddlerEvents.push([calendarEvent, undefined]);
    } else {
      let r:RRuleSet;
      if (typeof rruleSet === 'string') {
        r = deserializeRuleSet(rruleSet, this.tzid);
      } else {
        r = rruleSet;
      }
      this.tiddlerEvents.push([calendarEvent, r]);
    }
  }

  async getEventsInRange(start: Date, end: Date, eventMapper: EventMapper<TEvent>=async x => x as TEvent): Promise<TEvent[]> {
    const calendarEvents:TiddlerCalendarEvent[] = this.tiddlerEvents.reduce((
      acc:TiddlerCalendarEvent[],
      [calendarEvent, rruleSet]) => {
      if (rruleSet) {
        const occurances:Date[] = rruleSet.between(start, end, true);
        const duration_ms = (calendarEvent.start && calendarEvent.end) ? (calendarEvent.end.valueOf() - calendarEvent.start.valueOf()): this.defaultEventDuration;
        return acc.concat(
          occurances.map(eventStart => {
              return {
                ...calendarEvent,
                start: eventStart,
                end: new Date(eventStart.valueOf() + duration_ms)
              };
            }));
      }
      // for non-recurring events, calendarEvent.start must be set.
      if (withinDateRange(start, end, calendarEvent.start!) || (calendarEvent.end && withinDateRange(start, end, calendarEvent.end))) {
        acc.push({
          ...calendarEvent,
          end: calendarEvent.end ?? new Date(calendarEvent.start!.valueOf() + this.defaultEventDuration)
        });
      }
      return acc;
    }, [] as TiddlerCalendarEvent[]);
    return await Promise.all(calendarEvents.map(eventMapper));
  }

  removeEvent(tiddlerOrFilter: string|((event:TiddlerCalendarEvent) => boolean)) {
    const filter:(tiddlerEvent:TiddlerEvents["0"])=>boolean = typeof tiddlerOrFilter === 'string' ? ([{tiddler}]) => tiddlerOrFilter !== tiddler : ([tiddlerEvent]) => tiddlerOrFilter(tiddlerEvent);
    this.tiddlerEvents = this.tiddlerEvents.filter(filter);
  }

}
