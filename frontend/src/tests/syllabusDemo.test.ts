import {expect,it} from 'vitest';
import {syllabusDemo} from '../features/teaching/syllabusDemo';
it('provides eight teachable lectures with class times and a visible holiday example',()=>{
  const demo=syllabusDemo('2026-10-12');
  expect(demo.end_date).toBe('2027-04-12');
  expect(demo.topics.reduce((sum,topic)=>sum+topic.lectures,0)).toBe(8);
  expect(demo.holidays).toEqual(['2026-10-12']);
  expect(demo.slots.map(slot=>slot.weekday)).toEqual([0,2]);
});
it('keeps a six-month deadline valid when the target month is shorter',()=>{
  expect(syllabusDemo('2026-08-31').end_date).toBe('2027-02-28');
});
