import test from 'node:test';
import assert from 'node:assert/strict';
import {filterSessions,classify,rowErrors,normalizeExtracted,validInstagram,actorOptions} from '../src/lib/domain.js';
import {demoProductions,demoSessions} from '../src/lib/demo.js';
const p=demoProductions[0],rows=demoSessions.filter(r=>r.production_id===p.id);
test('same-role OR and cross-role AND with stable chronological ordering',()=>{
 const found=filterSessions(rows,{actors:{서윤:['한서아','윤채린'],도현:['강도원']}});
 assert.deepEqual(found.map(r=>r.id),['moon-0','moon-4','moon-5']);
});
test('date range inclusive, weekends and lower date bound',()=>{assert.deepEqual(filterSessions(rows,{from:'2026-10-09',to:'2026-10-11',weekends:true}).map(r=>r.id),['moon-4','moon-5']);});
test('empty role selection does not exclude any performances',()=>{assert.equal(filterSessions(rows,{actors:{서윤:[]}}).length,rows.length)});
test('duplicate comparison ignores role order and outer spaces but detects cast changes',()=>{
 assert.equal(classify({...rows[0],cast:[...rows[0].cast].reverse().map(c=>({...c,actor:` ${c.actor} `}))},rows),'duplicate');
 assert.equal(classify({...rows[0],cast:rows[0].cast.map((c,i)=>i?c:{...c,actor:'새 배우'})},rows),'changed');
 assert.equal(classify({...rows[0],starts_at:'2026-11-29T19:00:00'},rows),'new');
});
test('invalid dates, out-of-season rows, missing cast, and duplicate input are blocked',()=>{
 const bad={...rows[0],starts_at:'2026-02-30T14:00:00',cast:[]};assert.ok(rowErrors([bad],p)[0].length>=3);
 assert.ok(rowErrors([rows[0],rows[0]],p)[1].some(e=>e.includes('같은 회차')));
 assert.equal(rowErrors([rows[0]],p)[0].length,0);
});
test('extraction does not silently fill missing actor or date',()=>{
 const [row]=normalizeExtracted({performances:[{date:'',time:'14:00',cast:[{role:'서윤',actor:'한서아'}]}]},p);
 assert.equal(row.cast.find(c=>c.role==='도현').actor,'');assert.ok(rowErrors([row],p)[0].length);
 assert.throws(()=>normalizeExtracted({performances:'not-array'},p));
});
test('Instagram URLs enforce HTTPS and exact host',()=>{assert.ok(validInstagram('https://www.instagram.com/p/ABC_123/?igsh=x'));assert.ok(!validInstagram('https://instagram.com.evil.example/p/ABC'));assert.ok(!validInstagram('javascript:alert(1)'));assert.ok(!validInstagram('https://www.instagram.com/user/'));});
test('actor options are unique and role-specific',()=>{assert.deepEqual(actorOptions(rows,p.roles)['서윤'],['윤채린','이하린','한서아'])});

test('schedule release changes are saved even when the cast is unchanged',()=>{
 assert.equal(classify({...rows[0],casting_round:2},rows),'changed');
 assert.equal(classify({...rows[0],casting_round:1},rows),'duplicate');
 assert.equal(classify({...rows[0],casting_round:2},[{...rows[0],casting_round:2}]),'duplicate');
});
test('schedule release must be a positive PostgreSQL integer',()=>{
 for(const casting_round of [0,-1,1.5,'',2147483648]) assert.ok(rowErrors([{...rows[0],casting_round}],p)[0].some(e=>e.includes('공개 차수')));
 assert.equal(rowErrors([{...rows[0],casting_round:2}],p)[0].length,0);
});
