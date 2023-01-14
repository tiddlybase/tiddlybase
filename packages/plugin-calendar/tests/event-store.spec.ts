import { EventStore } from "../src/event-store";
import { RRuleSet, RRule } from 'rrule'
import { makeAnnuallyRecurringRRuleSet } from "../src/rrule-utils";
import { TiddlerCalendarEvent } from "../src/TiddlerCalendarEvent";
// import { rrulestr } from 'rrule'

const makeEventStore = () => new EventStore<TiddlerCalendarEvent>();

describe('Event store', function () {

  it('Should return date tiddler when in range', async () => {
    const store = makeEventStore();
    store.addEvent({tiddler: 'tiddler1', start: new Date('2023-01-02T00:00:00Z')});
    expect(await store.getEventsInRange(
      new Date('2023-01-01T00:00:00Z'),
      new Date('2023-01-03T00:00:00Z')
    )).toEqual([{
      tiddler: 'tiddler1',
      start: new Date('2023-01-02T00:00:00Z'),
      end: new Date('2023-01-02T01:00:00.000Z')
    }]);
    // range after event
    expect(await store.getEventsInRange(
      new Date('2023-01-03T00:00:00Z'),
      new Date('2023-01-05T00:00:00Z')
    )).toEqual([]);
  });


  it('Should return all recurring tiddler instances in range', async () => {
    const store = makeEventStore();
    const ruleSet = new RRuleSet();
    ruleSet.rrule(new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO, RRule.FR],
      dtstart: new Date('2022-02-03T00:00:00Z'),
      until: new Date('2022-03-03T00:00:00Z')
    }));
    store.addEvent({tiddler: 'tiddler1'}, ruleSet);
    expect(await store.getEventsInRange(
      new Date('2022-01-01T00:00:00Z'),
      new Date('2022-12-31T00:00:00Z')
    )).toEqual([
      {
        "start": new Date('2022-02-04T00:00:00.000Z'),
        "end": new Date('2022-02-04T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-07T00:00:00.000Z'),
        "end": new Date('2022-02-07T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-11T00:00:00.000Z'),
        "end": new Date('2022-02-11T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-14T00:00:00.000Z'),
        "end": new Date('2022-02-14T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-18T00:00:00.000Z'),
        "end": new Date('2022-02-18T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-21T00:00:00.000Z'),
        "end": new Date('2022-02-21T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-25T00:00:00.000Z'),
        "end": new Date('2022-02-25T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2022-02-28T00:00:00.000Z'),
        "end": new Date('2022-02-28T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
    ]
    );
  });

  it('Should support rulesets with multiple rules', async () => {
    const store = makeEventStore();
    const ruleSet = makeAnnuallyRecurringRRuleSet({ month: 3, day: 21 }, { month: 6, day: 11 }, { month: 8, day: 23 });
    store.addEvent({tiddler: 'tiddler1'}, ruleSet);
    expect(await store.getEventsInRange(
      new Date('2010-08-14T00:00:00Z'),
      new Date('2012-08-14T00:00:00Z')
    )).toEqual([
      {
        "start": new Date('2010-08-23T00:00:00.000Z'),
        "end": new Date('2010-08-23T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2011-03-21T00:00:00.000Z'),
        "end": new Date('2011-03-21T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2011-06-11T00:00:00.000Z'),
        "end": new Date('2011-06-11T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2011-08-23T00:00:00.000Z'),
        "end": new Date('2011-08-23T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2012-03-21T00:00:00.000Z'),
        "end": new Date('2012-03-21T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2012-06-11T00:00:00.000Z'),
        "end": new Date('2012-06-11T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },

    ]);
  });

  it('Should support rulesets specified as strings', async () => {
    const store = makeEventStore();
    store.addEvent({tiddler: 'tiddler1'}, "{\"rrules\":[\"DTSTART:20000321T000000Z\\nRRULE:FREQ=YEARLY\",\"DTSTART:20000611T000000Z\\nRRULE:FREQ=YEARLY\",\"DTSTART:20000823T000000Z\\nRRULE:FREQ=YEARLY\"]}");
    expect(await store.getEventsInRange(
      new Date('2010-08-14T00:00:00Z'),
      new Date('2012-08-14T00:00:00Z')
    )).toEqual([
      {
        "start": new Date('2010-08-23T00:00:00.000Z'),
        "end": new Date('2010-08-23T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2011-03-21T00:00:00.000Z'),
        "end": new Date('2011-03-21T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2011-06-11T00:00:00.000Z'),
        "end": new Date('2011-06-11T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2011-08-23T00:00:00.000Z'),
        "end": new Date('2011-08-23T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2012-03-21T00:00:00.000Z'),
        "end": new Date('2012-03-21T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },
      {
        "start": new Date('2012-06-11T00:00:00.000Z'),
        "end": new Date('2012-06-11T01:00:00.000Z'),
        "tiddler": "tiddler1",
      },

    ]);
  });
});

