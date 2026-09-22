// A portable demo preview of the production bundle. Never export a configured
// production build: this file is for demo review, not production deployment.
import {readFile,writeFile,readdir} from 'node:fs/promises';
const assets=await readdir(new URL('../dist/assets/',import.meta.url));
const js=await readFile(new URL('../dist/assets/'+assets.find(f=>f.endsWith('.js')),import.meta.url),'utf8');
const css=await readFile(new URL('../dist/assets/'+assets.find(f=>f.endsWith('.css')),import.meta.url),'utf8');
let html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
html=html.replace(/<script type="module"[^>]*><\/script>/g,'').replace(/<link rel="stylesheet"[^>]*>/g,()=>'<style>'+css+'</style>');
html=html.replace(/<link rel="icon"[^>]*>/g,'');
html=html.replace('</body>',()=>'<script>'+js.replaceAll('</script','<\\/script')+'</script></body>');
const destination=process.argv[2]||'castingpick-preview.html';
await writeFile(destination,html);
console.log('Preview:',destination);
