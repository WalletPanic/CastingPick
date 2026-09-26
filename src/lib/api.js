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
export const commitImport=body=>request('/rest/v1/rpc/commit_import_with_roles',{method:'POST',body});
export async function analyze(file,production){
 const access=await token();if(!access)throw new Error('관리자 로그인이 필요해요.');
 const body=new FormData();body.append('image',file);body.append('production_id',production.id);
 return parse(await fetch(`${url}/functions/v1/analyze-schedule`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`},body}));
}
export async function uploadSource(file){if(!file)return null;const access=await token();const path=`${session.user.id}/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`;await parse(await fetch(`${url}/storage/v1/object/casting-sources/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`,'Content-Type':file.type},body:file}));return path;}

export async function signUp(email,password){const data=await parse(await fetch(`${url}/auth/v1/signup`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})}));if(data.access_token)remember(data);return data;}
export const getSubmissions=()=>allRows('/rest/v1/schedule_submissions?select=*&order=created_at.desc,id.asc');
export async function submitSchedule({production_id,title,source_url,files}){
 const access=await token();if(!access)throw new Error('로그인이 필요합니다.');
 const id=crypto.randomUUID(),paths=[];
 try{
  for(const file of files){const path=`${session.user.id}/${id}/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`;
   await parse(await fetch(`${url}/storage/v1/object/schedule-submissions/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`,'Content-Type':file.type},body:file}));paths.push(path);
  }
  return await request('/rest/v1/schedule_submissions',{method:'POST',headers:{Prefer:'return=representation'},body:{id,submitted_by:session.user.id,production_id:production_id||null,title,source_url:source_url||null,image_paths:paths}});
 }catch(error){if(paths.length)await request('/storage/v1/object/schedule-submissions',{method:'DELETE',body:{prefixes:paths}}).catch(()=>{});throw error;}
}
export async function submissionImage(path){const access=await token();const res=await fetch(`${url}/storage/v1/object/authenticated/schedule-submissions/${path}`,{headers:{apikey:key,Authorization:`Bearer ${access}`}});if(!res.ok)throw new Error('원본을 불러오지 못했습니다.');return res.blob();}

export async function uploadPoster(file){
 const access=await token();if(!access)throw new Error('관리자 로그인이 필요합니다.');
 const path=`${session.user.id}/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`;
 const response=await fetch(`${url}/storage/v1/object/production-posters/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`,'Content-Type':file.type},body:file});
 if(!response.ok){const detail=await response.text();if(detail.includes('Bucket not found'))throw new Error('공연 포스터 저장소 설정이 필요합니다. 관리자용 DB 설정 SQL을 실행해주세요.');throw new Error('포스터를 저장하지 못했습니다. 관리자 권한과 저장소 설정을 확인해주세요.');}
 return {path,url:`${url}/storage/v1/object/public/production-posters/${path}`};
}
export const removePoster=path=>request('/storage/v1/object/production-posters',{method:'DELETE',body:{prefixes:[path]}});

export const editProduction=(id,expected,data)=>request('/rest/v1/rpc/edit_production',{method:'POST',body:{p_id:id,p_expected:expected,p_data:data}});
export const editPerformance=(id,expected,data)=>request('/rest/v1/rpc/edit_performance',{method:'POST',body:{p_id:id,p_expected:expected,p_data:data}});
