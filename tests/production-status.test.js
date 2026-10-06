import test from 'node:test';
import assert from 'node:assert/strict';
import {productionStatus,koreaToday} from '../src/lib/domain.js';
test('status includes both start and end date as running',()=>{
 const p={start_date:'2026-10-06',end_date:'2026-10-10'};
 assert.equal(productionStatus(p,'2026-10-05'),'upcoming');
 assert.equal(productionStatus(p,'2026-10-06'),'running');
 assert.equal(productionStatus(p,'2026-10-10'),'running');
 assert.equal(productionStatus(p,'2026-10-11'),'ended');
 assert.equal(koreaToday(new Date('2026-10-05T15:00:00Z')),'2026-10-06');
});
