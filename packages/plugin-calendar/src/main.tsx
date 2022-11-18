import { FC } from 'react'
import { Calendar, CalendarProps, dateFnsLocalizer, Event as CalendarEvent } from 'react-big-calendar'
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import hu from 'date-fns/locale/hu'

export {
  addHours,
  startOfHour,
  startOfISOWeek,
  startOfMonth,
  startOfToday,
  startOfTomorrow,
  endOfHour,
  endOfDay
 } from 'date-fns'

import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

export type CalendarAppProps<TEvent extends object = CalendarEvent, TResource extends object = object> = withDragAndDropProps<TEvent, TResource> & CalendarProps<TEvent, TResource>;

//@ts-ignore
const DnDCalendar = withDragAndDrop(Calendar<CalendarEvent, object>);

const locales = {
  'en-US': enUS,
  'hu': hu
};

// The types here are `object`. Strongly consider making them better as removing `locales` caused a fatal error
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const CalendarApp: FC<CalendarAppProps> = (props:CalendarAppProps) => {
  return (
    <DnDCalendar
      {...{
        ...props,
        localizer,
      }}
    />
  );
}

