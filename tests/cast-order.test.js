import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedCast} from '../src/lib/domain.js';
test('cards follow saved sidebar order and retain all remaining roles without mutating cast',()=>{
 const cast=['라울','오페라의 유령','칼롯타','크리스틴','추가배역'].map(role=>({role,actor:'배우'}));
 const roles=['오페라의 유령','크리스틴','라울','칼롯타'];
 assert.deepEqual(orderedCast(cast,{roles}).map(c=>c.role),[...roles,'추가배역']);
 assert.deepEqual(orderedCast(cast,{roles,filter_roles:['크리스틴','오페라의 유령']}).map(c=>c.role),['크리스틴','오페라의 유령','라울','칼롯타','추가배역']);
 assert.deepEqual(orderedCast(cast,{roles,filter_roles:[]}).map(c=>c.role),[...roles,'추가배역']);
 assert.equal(cast[0].role,'라울');
 assert.deepEqual(orderedCast(cast,undefined),cast);
});
