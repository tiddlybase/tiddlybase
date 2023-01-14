import { RRuleSet } from 'rrule'
import { deserializeRuleSet, makeAnnuallyRecurringRRuleSet, serializeRuleSet } from "../src/rrule-utils";

describe('rrule-utils', function () {

  it('Should correctly serialize RRULE', async () => {
    const ruleSet:RRuleSet = makeAnnuallyRecurringRRuleSet({ month: 3, day: 21 }, { month: 6, day: 11 }, { month: 8, day: 23 });
    expect(ruleSet.toString()).toEqual(`DTSTART:20000321T000000Z
RRULE:FREQ=YEARLY
DTSTART:20000611T000000Z
RRULE:FREQ=YEARLY
DTSTART:20000823T000000Z
RRULE:FREQ=YEARLY`);
    expect(serializeRuleSet(ruleSet)).toEqual("{\"rrules\":[\"DTSTART:20000321T000000Z\\nRRULE:FREQ=YEARLY\",\"DTSTART:20000611T000000Z\\nRRULE:FREQ=YEARLY\",\"DTSTART:20000823T000000Z\\nRRULE:FREQ=YEARLY\"]}");
  });

  it('Should correctly deserialize RRULE', async () => {
    const ruleSet = deserializeRuleSet("{\"rrules\":[\"DTSTART:20000321T000000Z\\nRRULE:FREQ=YEARLY\",\"DTSTART:20000611T000000Z\\nRRULE:FREQ=YEARLY\",\"DTSTART:20000823T000000Z\\nRRULE:FREQ=YEARLY\"]}");
    expect(ruleSet.toString()).toEqual(`DTSTART:20000321T000000Z
RRULE:FREQ=YEARLY
DTSTART:20000611T000000Z
RRULE:FREQ=YEARLY
DTSTART:20000823T000000Z
RRULE:FREQ=YEARLY`);
  })

});
