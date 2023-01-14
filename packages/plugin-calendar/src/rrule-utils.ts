import { RRuleSet, RRule, rrulestr } from 'rrule'

const makeInitialTimestamp = (month: number, day: number) => `2000-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`;

export type MonthAndDay = {
  month:number; // 1 = january not like insane Date object constructor
  day:number;
}

export const makeAnnuallyRecurringRRuleSet = (...days:MonthAndDay[]):RRuleSet => {
  const ruleSet = new RRuleSet();
  for (const { month, day } of days) {
    ruleSet.rrule(new RRule({
      freq: RRule.YEARLY,
      dtstart: new Date(makeInitialTimestamp(month, day))
    }));
  }
  return ruleSet;
};

export const serializeRuleSet = (ruleSet:RRuleSet): string => {
  return JSON.stringify({rrules: ruleSet.rrules().map(r => r.toString())});
};

export const deserializeRuleSet = (serializedRuleSet:string, tzid?:string): RRuleSet => {
  const parsed = JSON.parse(serializedRuleSet);
  const rules = (parsed.rrules as string[]).map(s => rrulestr(s));
  const ruleSet = new RRuleSet();
  rules.forEach(r => ruleSet.rrule(r));
  if (tzid) {
    ruleSet.tzid = () => tzid;
  }
  return ruleSet;
};
