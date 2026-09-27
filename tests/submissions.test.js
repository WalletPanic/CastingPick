import test from 'node:test';
import assert from 'node:assert/strict';
import {validSubmissionSource} from '../src/lib/submissions.js';
test('submission requires a usable HTTPS source and blocks unsafe link schemes',()=>{
 for(const value of ['https://example.com/casting?round=2#schedule','https://www.instagram.com/p/example/'])assert.equal(validSubmissionSource(value),true);
 for(const value of [undefined,null,'','https://','http://example.com','javascript:alert(1)','https://user:pass@example.com','https://example.com/a b','https://example.com/'+ 'a'.repeat(2000)])assert.equal(validSubmissionSource(value),false);
});
