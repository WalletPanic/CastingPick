import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rowErrors,actorOptions,filterSessions} from '../src/lib/domain.js';
const {production:p,performances:rows}=JSON.parse(readFileSync(new URL('../data/elisabeth-2026.json',import.meta.url)));
test('all five image releases contain 120 unique complete performances',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>rows.filter(r=>r.casting_round===n).length),[25,21,15,29,30]);
 assert.equal(new Set(rows.map(r=>r.starts_at)).size,120);
 assert.ok(rowErrors(rows,p).every(errors=>errors.length===0));
 assert.ok(rows.every(r=>r.cast.length===6));
 assert.equal(rows[0].starts_at,'2026-08-16T19:00:00');
 assert.equal(rows.at(-1).starts_at,'2026-11-15T15:00:00');
});
test('all 17 actors are registered, with only three selectable lead roles',()=>{
 assert.deepEqual(p.filter_roles,['엘리자벳','토드','루케니']);
 const options=actorOptions(rows,p.roles);
 assert.deepEqual(p.roles.map(r=>options[r].length),[4,4,3,2,2,2]);
 assert.equal(new Set(rows.flatMap(r=>r.cast.map(c=>c.actor))).size,17);
 assert.equal(filterSessions(rows,{actors:{토드:['김준수'],엘리자벳:['린아']}}).length,3);
});
test('unusual image times and first/last performance labels are retained',()=>{
 for(const date of ['2026-11-10','2026-11-11'])assert.equal(rows.find(r=>r.starts_at.startsWith(date)).starts_at.slice(11,16),'14:30');
 assert.deepEqual(rows.slice(0,3).map(r=>r.schedule_notes),[['Preview'],['Preview'],['Preview']]);
 assert.ok(rows.find(r=>r.starts_at==='2026-10-03T14:00:00').schedule_notes.includes('토드 김준수 첫공'));
 assert.equal(rows.at(-1).schedule_notes.length,6);
});
