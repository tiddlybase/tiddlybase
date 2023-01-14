import {subscribeEventStore, eventStore} from './tiddler-events';
export const name = "load-calendar-events-on-startup";
export const platforms = ["browser"];
export const after = ['startup'];
export const synchronous = true;
export const startup = () => {
  subscribeEventStore(eventStore);
}
