import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/PosterVariants.jsx',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('export function initialPosters'),source.indexOf('function PosterSlot'));
const {initialPosters,uploadPosters}=await import('data:text/javascript;base64,'+Buffer.from("const api={uploadPoster:async f=>({path:f.name,url:'https://test/'+f.name})};"+helpers).toString('base64'));
test('legacy posters remain original; switching does not overwrite either saved variant',async()=>{
 const state=initialPosters({poster_url:'original'});assert.equal(state.original,'original');
 state.illustrated='drawing';state.active='illustrated';const uploads=[];
 const data=await uploadPosters(state,uploads);assert.equal(data.poster_url,'drawing');assert.equal(data.poster_original_url,'original');assert.equal(uploads.length,0);
 state.active='original';assert.equal((await uploadPosters(state,uploads)).poster_url,'original');
});
test('missing selected image and invalid files are rejected before uploads',async()=>{
 const state=initialPosters();state.active='illustrated';await assert.rejects(uploadPosters(state,[]));
 state.files.original={type:'image/png',size:9*1024*1024};await assert.rejects(uploadPosters(state,[]));
});
test('both uploads are preserved and only the selected image becomes public poster',async()=>{
 const state=initialPosters();state.active='illustrated';state.files={original:{name:'original',type:'image/png',size:100},illustrated:{name:'drawing',type:'image/png',size:100}};
 const uploads=[];const data=await uploadPosters(state,uploads);assert.equal(uploads.length,2);assert.equal(data.poster_original_url,'https://test/original');assert.equal(data.poster_url,'https://test/drawing');
});

test('illustrated-only production keeps original slot empty',()=>{assert.equal(initialPosters({poster_variant:'illustrated',poster_url:'drawing',poster_original_url:null,poster_illustrated_url:'drawing'}).original,'')});
