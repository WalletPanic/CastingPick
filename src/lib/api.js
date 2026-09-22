import {readLocal,writeLocal} from './storage';
const url=import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/,'');
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured=Boolean(url&&key);
export const incompleteConfig=Boolean(url)!==Boolean(key);
const sessionKey='castingpick.auth.v1';
let session=readLocal(sessionKey,null), refreshing=null;
export const getSession=()=>session;
function remember(data){session=data?{...data,expires_at:Math.floor(Date.now()/1000)+data.expires_in}:null;writeLocal(sessionKey,session);window.dispatchEvent(new Event('castingpick-auth'));}
async function parse(response){const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw new Error('서버 응답을 읽지 못했습니다.');}if(!response.ok)throw new Error(data?.error_description||data?.message||data?.error||`요청 실패 (${response.status})`);return data;}
async function token(){
 if(session&&session.expires_at<Date.now()/1000+60){
  if(!refreshing)refreshing=fetch(`${url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})}).then(parse).then(remember).catch(e=>{remember(null);throw e;}).finally(()=>refreshing=null);
  await refreshing;
 }
 return session?.access_token;
}
export async function request(path,{method='GET',body,headers={}}={}){const access=await token();return parse(await fetch(url+path,{method,headers:{apikey:key,...(access?{Authorization:`Bearer ${access}`} : {}),'Content-Type':'application/json',...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}));}
export async function signIn(email,password){const data=await parse(await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})}));remember(data);}
export async function signOut(){try{await request('/auth/v1/logout',{method:'POST'});}finally{remember(null);}}
export const isAdmin=()=>request('/rest/v1/rpc/is_admin',{method:'POST',body:{}});
export const getProductions=()=>allRows('/rest/v1/productions?select=*&order=start_date.asc,id.asc');
async function allRows(path){let result=[];for(let offset=0;;offset+=500){const rows=await request(`${path}&limit=500&offset=${offset}`);result.push(...rows);if(rows.length<500)return result;}}
export const getPerformances=()=>allRows('/rest/v1/performances?select=*&order=starts_at.asc,id.asc');
export const getFavorites=()=>allRows('/rest/v1/favorites?select=performance_id&order=performance_id.asc').then(rows=>rows.map(r=>r.performance_id));
export const saveFavorite=(id,selected)=>request(`/rest/v1/favorites${selected?'':`?performance_id=eq.${id}`}`,{method:selected?'POST':'DELETE',...(selected?{body:{user_id:session.user.id,performance_id:id},headers:{Prefer:'resolution=ignore-duplicates'}}:{})});
export const addProduction=data=>request('/rest/v1/productions',{method:'POST',body:data,headers:{Prefer:'return=representation'}}).then(rows=>rows[0]);
export const commitImport=body=>request('/rest/v1/rpc/commit_import',{method:'POST',body});
export async function analyze(file,production){
 const access=await token();if(!access)throw new Error('관리자 로그인이 필요해요.');
 const body=new FormData();body.append('image',file);body.append('production_id',production.id);
 return parse(await fetch(`${url}/functions/v1/analyze-schedule`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`},body}));
}
export async function uploadSource(file){if(!file)return null;const access=await token();const path=`${session.user.id}/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`;await parse(await fetch(`${url}/storage/v1/object/casting-sources/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`,'Content-Type':file.type},body:file}));return path;}
