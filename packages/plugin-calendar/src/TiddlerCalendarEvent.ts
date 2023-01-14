import { Event as CalendarEvent } from 'react-big-calendar';
import type {} from '@tiddlybase/tw5-types/src/index'

export type TiddlerCalendarEvent = CalendarEvent & {
  tiddler: $tw.TiddlerFields["title"]
}
