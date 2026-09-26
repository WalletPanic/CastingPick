export const datePart = value => value.slice(0, 10);
export const timePart = value => value.slice(11, 16);
export const koreaDate = (date) => new Date(`${date}T12:00:00+09:00`);
export const weekday = date => new Intl.DateTimeFormat('ko-KR', {weekday:'short',timeZone:'Asia/Seoul'}).format(koreaDate(date));
export const sortSessions = rows => [...rows].sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
export function filterSessions(rows, {actors={},from='',to='',rounds=[],weekends=false,showPast=true,now=Date.now()}={}) {
  return sortSessions(rows.filter(row=>{
    const date=datePart(row.starts_at);
    return (!rounds.length||rounds.includes(row.casting_round??1))&&(showPast||Date.parse(`${row.starts_at}+09:00`)>now)&&(!from||date>=from)&&(!to||date<=to)&&(!weekends||['토','일'].includes(weekday(date)))&&
      Object.entries(actors).every(([role,names])=>!names.length||row.cast.some(c=>c.role===role&&names.includes(c.actor)));
  }));
}
export function actorOptions(rows, roles=[]) {
  return Object.fromEntries((roles??[]).map(role=>[role,[...new Set(rows.flatMap(s=>s.cast.filter(c=>c.role===role).map(c=>c.actor)))].sort((a,b)=>a.localeCompare(b,'ko'))]));
}
export function castKey(cast) { return JSON.stringify(cast.map(c=>({role:c.role.trim(),actor:c.actor.trim()})).sort((a,b)=>a.role.localeCompare(b.role)||a.actor.localeCompare(b.actor))); }
export function classify(row,existing){
  const previous=existing.find(s=>s.starts_at===row.starts_at);
  return !previous?'new':castKey(previous.cast)===castKey(row.cast)&&(previous.casting_round??1)===(row.casting_round??1)?'duplicate':'changed';
}
export function rowErrors(rows,production) {
  const seen=new Set();
  return rows.map(row=>{
    const errors=[];const value=row.starts_at;
    const round=row.casting_round??1;
    if(!Number.isInteger(round)||round<1||round>2147483647)errors.push('공개 차수는 1 이상의 정수로 입력해주세요.');
    const date=datePart(value); const parsed=new Date(`${date}T12:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)errors.push('날짜와 시간을 확인해주세요.');
    if(date<production.start_date||date>production.end_date)errors.push('공연 기간 밖의 날짜예요.');
    if(seen.has(value))errors.push('검수 목록 안에 같은 회차가 있어요.');seen.add(value);
    if(row.cast.length!==production.roles.length||production.roles.some(role=>row.cast.filter(c=>c.role===role&&c.actor.trim()).length!==1))errors.push('모든 배역의 배우를 입력해주세요.');
    return errors;
  });
}
export function normalizeExtracted(input,production){
  if(!input||!Array.isArray(input.performances)||input.performances.length>200)throw new Error('분석 결과 형식이 올바르지 않습니다.');
  return input.performances.map(row=>({
    id:crypto.randomUUID(), production_id:production.id,
    starts_at:`${typeof row.date==='string'?row.date:''}T${typeof row.time==='string'?row.time:''}:00`,
    cast:production.roles.map(role=>({role,actor:Array.isArray(row.cast)?String(row.cast.find(c=>c.role===role)?.actor??''):''})),
    warnings:Array.isArray(row.warnings)?row.warnings.filter(w=>typeof w==='string'):[]
  }));
}
export function validInstagram(value){
  if(!value)return true;
  try{const u=new URL(value);return u.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(u.hostname)&&/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);}catch{return false;}
}

export function extractedRoles(input,production){
 const roles=input?.roles;
 if(!Array.isArray(roles)||!roles.length||roles.length>30||roles.some(r=>typeof r!=='string'||!r.trim()||r.trim().length>80)||new Set(roles.map(r=>r.trim())).size!==roles.length)throw new Error('배역명을 읽지 못했거나 중복되어 있어요. 표 머리글이 선명한 사진으로 다시 올려주세요.');
 const clean=roles.map(r=>r.trim());
 if(production.roles.length&&(clean.length!==production.roles.length||clean.some(r=>!production.roles.includes(r))))throw new Error('이미지의 배역과 등록된 배역이 다릅니다. 올바른 공연의 캐스팅표인지 확인해주세요.');
 if(!Array.isArray(input.performances)||input.performances.some(row=>!Array.isArray(row.cast)||row.cast.length!==clean.length||clean.some(role=>row.cast.filter(c=>c.role===role).length!==1)))throw new Error('회차별 배역을 정확히 읽지 못했어요. 다른 사진으로 다시 분석해주세요.');
 return production.roles.length?production.roles:clean;
}
