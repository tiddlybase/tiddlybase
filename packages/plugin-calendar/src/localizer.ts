import type {DateLocalizer, View, Culture, CalendarProps, Event as CalendarEvent } from 'react-big-calendar'
import { dateFnsLocalizer } from 'react-big-calendar'

import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import hu from 'date-fns/locale/hu'

export type DateRange = Parameters<Exclude<CalendarProps<CalendarEvent, object>["onRangeChange"], undefined>>["0"];


const locales = {
  'en-US': enUS,
  'hu': hu
};

export type TimeUnit = 'day' | 'week' | 'month';

// The DateLocalizer typings leave out some functions, corrected here:
export interface ExtendedDateLocalizer extends DateLocalizer {
  startOf: (date:Date, timeUnit:TimeUnit, firstOfWeek?: number) => Date;
  endOf: (date:Date, timeUnit:TimeUnit, firstOfWeek?: number) => Date;
  add: (current:Date, amount:number, timeUnit:TimeUnit)=> Date;
  range: (start:Date, end:Date) => DateRange;
}

// The types here are `object`. Strongly consider making them better as removing `locales` caused a fatal error
export const getDefaultLocalizer = ():ExtendedDateLocalizer => dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
}) as ExtendedDateLocalizer;

const getContainingRange = (localizer: ExtendedDateLocalizer, startDate: Date, timeUnit:TimeUnit):DateRange => {
  const start = localizer.startOf(startDate, timeUnit);
  return {start, end: localizer.add(start, 1, timeUnit)};
}

const getContainingWeek = (culture: Culture, localizer: ExtendedDateLocalizer, startDate: Date):DateRange => {
  let firstOfWeek = localizer.startOfWeek(culture);
  let start = localizer.startOf(startDate, 'week', firstOfWeek)
  let end = localizer.endOf(startDate, 'week', firstOfWeek)
  return localizer.range(start, end);
}

const getContainingDay = (localizer: ExtendedDateLocalizer, startDate: Date):DateRange => [localizer.startOf(startDate, 'day')];

export const getInitialRange = (culture: Culture, localizer: ExtendedDateLocalizer, view:View, startDate: Date):DateRange => {
  switch (view) {
    case 'month':
      return getContainingRange(localizer, startDate, 'month');
      break;
    case 'week':
      return getContainingWeek(culture, localizer, startDate);
      break;
    case 'work_week':
      return getContainingWeek(culture, localizer, startDate);
      break;
    case 'day':
      return getContainingDay(localizer, startDate);
      break;
    case 'agenda':
      return getContainingDay(localizer, startDate);
      break;
  }
};
