import {useEffect,useMemo,useState} from 'react';
import Icon from './Icon';
import {classify,datePart,timePart,rowErrors,normalizeExtracted,validInstagram} from '../lib/domain';
import {demoImport} from '../lib/demo';
import * as api from '../lib/api';
const labels={new:'신규',duplicate:'중복',changed:'변경'};
export default function Admin({productions,sessions,demo,user,admin,onLogin,onSaved,onCreate,notify}){
 const [productionId,setProductionId]=useState(productions[0]?.id||'');
 const production=productions.find(p=>p.id===productionId);
 const existing=useMemo(()=>sessions.filter(s=>s.production_id===productionId),[sessions,productionId]);
 const [castingRound,setCastingRound]=useState(1);
 const [file,setFile]=useState(null),[preview,setPreview]=useState(''),[source,setSource]=useState('');
 const [rows,setRows]=useState(null),[baseline,setBaseline]=useState([]),[excluded,setExcluded]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[creating,setCreating]=useState(false);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 const reviewRows=(rows||[]).map(r=>({...r,casting_round:castingRound}));
 const included=reviewRows.filter(r=>!excluded.includes(r.id));
 const errors=production?rowErrors(included,production):[];
 const totals={new:0,duplicate:0,changed:0};included.forEach(r=>totals[classify(r,baseline)]++);
 function changeProduction(id){setProductionId(id);setCastingRound(1);setRows(null);setSaved(null);setError('');setExcluded([]);setFile(null);setSource('');}
 function acceptFile(value){if(!value)return; if(!['image/png','image/jpeg','image/webp'].includes(value.type)||value.size>8*1024*1024){setError('PNG, JPG, WEBP 파일을 8MB 이하로 올려주세요.');return;}setFile(value);setRows(null);setSaved(null);setError('');}
 function startReview(values){if(!production?.roles.length){setError('시간표 등록 전 공연 배역 설정이 필요합니다.');return;}setBaseline(structuredClone(existing));setRows(values);setExcluded([]);setSaved(null);setError('');}
 async function analyze(){if(!file||!production)return;if(!production.roles.length){setError('시간표 분석 전 공연 배역 설정이 필요합니다.');return;}setBusy(true);setError('');try{const data=await api.analyze(file,production);startReview(normalizeExtracted(data,production));}catch(e){setError(e.message)}finally{setBusy(false)}}
 function edit(id,key,value,role){setRows(old=>old.map(row=>row.id!==id?row:{...row,...(key==='cast'?{cast:row.cast.map(c=>c.role===role?{...c,actor:value}:c)}:{starts_at:key==='date'?`${value}T${timePart(row.starts_at)}:00`:`${datePart(row.starts_at)}T${value}:00`})}));setError('');}
 function addRow(){setRows(old=>[...(old||[]),{id:crypto.randomUUID(),production_id:productionId,starts_at:production.start_date+'T14:00:00',cast:production.roles.map(role=>({role,actor:''}))}]);}
 async function save(){
  setError('');if(!validInstagram(source)){setError('올바른 인스타 게시물 또는 릴스 링크를 입력해주세요.');return;}if(errors.some(e=>e.length)){setError('표시된 날짜와 배우 정보를 수정해주세요.');return;}if(!included.length){setError('저장할 회차를 선택해주세요.');return;}
  setBusy(true);try{let result;if(demo){result=await onSaved(productionId,included,baseline);}else{
   const sourcePath=await api.uploadSource(file);
   result=await api.commitImport({p_production_id:productionId,p_rows:included.map(r=>({starts_at:r.starts_at,casting_round:r.casting_round,cast:r.cast.map(c=>({...c,actor:c.actor.trim()})),expected_updated_at:baseline.find(s=>s.starts_at===r.starts_at)?.updated_at??null})),p_source_url:source||null,p_source_path:sourcePath});
   await onSaved();
  }setSaved(result);setRows(null);notify('검수한 캐스팅표를 저장했어요.');}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 if(!demo&&!user)return <section className="page narrow"><div className="eyebrow">ADMIN</div><h1>캐스팅표 등록</h1><p className="muted">관리자 계정으로 로그인해주세요.</p><form className="panel form-stack" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await onLogin(email,password)}catch(e){setError('로그인하지 못했어요. 이메일과 비밀번호를 확인해주세요.')}finally{setBusy(false)}}}><label>이메일<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>비밀번호<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy}>{busy?'로그인 중…':'관리자 로그인'}</button></form></section>;
 if(!demo&&!admin)return <section className="page"><div className="empty"><Icon name="user" size={28}/><h2>관리자 권한이 필요해요</h2><p>현재 계정은 공연을 등록할 수 없습니다.</p></div></section>;
 return <section className="page admin-page"><div className="page-title"><div><div className="eyebrow">CASTING STUDIO</div><h1>캐스팅표 등록</h1></div><span className="pill">{demo?'데모 관리자':'관리자'}</span></div><p className="intro-copy">새로운 시간표를, 새로운 관극으로.<br/>원본과 비교하고 확인한 회차만 저장하세요.</p>
 <div className="stepper"><span className={!rows&&!saved?'current':''}>01 등록</span><span className={rows?'current':''}>02 검수</span><span className={saved?'current':''}>03 완료</span></div>
 <div className="admin-toolbar"><label>공연 선택<select disabled={busy} value={productionId} onChange={e=>changeProduction(e.target.value)}><option value="" disabled>공연을 선택해주세요</option>{productions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.venue}</option>)}</select></label><button className="secondary" onClick={()=>setCreating(!creating)}><Icon name="plus" size={16}/>공연 추가</button></div>
 <label className="source-label">캐스팅 스케줄 공개 차수<input type="number" min="1" max="2147483647" step="1" value={castingRound} disabled={busy} onChange={e=>setCastingRound(e.target.value===''?'':Number(e.target.value))}/></label><p className="helper">1차·2차 등 스케줄 공개분을 입력하세요. 이번에 저장하는 모든 회차에 적용됩니다.</p>
 {creating&&<ProductionForm onCreate={async value=>{const p=await onCreate(value);setCreating(false);changeProduction(p.id);notify('공연이 등록되어 사이트에 게시됐어요.');location.hash=`/show/${p.id}`}}/>}
 {error&&<p role="alert" className="error">{error}</p>}
 {saved?<div className="completion panel"><div className="completion-icon"><Icon name="check" size={30}/></div><h2>시간표가 준비됐어요</h2><p>신규 {saved.new}회 · 변경 {saved.changed}회 · 중복 제외 {saved.duplicate}회</p><a className="primary" href={`#/show/${productionId}`}>등록한 공연 확인<Icon name="arrow" size={16}/></a><button className="text-button" onClick={()=>{setSaved(null);setFile(null);setSource('')}}>다른 시간표 등록</button></div>:production&&<>
 {!rows?<div className="panel upload-panel"><label className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();acceptFile(e.dataTransfer.files[0])}}><Icon name="upload" size={28}/><strong>{file?file.name:'캐스팅표 이미지를 올려주세요'}</strong><span>사진 선택 또는 드래그 · JPG, PNG, WEBP · 최대 8MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>acceptFile(e.target.files[0])}/></label>{preview&&<img className="source-preview" src={preview} alt="업로드한 캐스팅표"/>}<label className="source-label">인스타 출처 링크 <span className="optional">선택</span><input type="url" placeholder="https://www.instagram.com/p/..." value={source} onChange={e=>setSource(e.target.value)}/></label><p className="helper">링크는 출처로 보관해요. 인스타 사진 자동 수집은 지원하지 않으니 캐스팅표 이미지를 함께 올려주세요.</p>
 {!demo&&<button className="primary full" disabled={!file||busy} onClick={analyze}><Icon name="spark" size={18}/>{busy?'이미지 분석 중…':'이미지 분석하기'}</button>}
 {demo&&<><p className="demo-notice">체험 모드에서는 실제 이미지를 분석하지 않아요. 등록된 엘리자벳 회차로 검수 흐름을 확인할 수 있어요.</p><button className="primary full" onClick={()=>startReview(demoImport(production,existing))}>등록 회차 검수 체험<Icon name="arrow" size={16}/></button></>}
 <button className="text-button full" onClick={()=>{startReview([])}}>직접 회차 입력하기</button></div>:<div className="review-layout">{preview&&<div className="review-original"><h2>원본 이미지</h2><img src={preview} alt="검수할 캐스팅표 원본"/></div>}<div className="review-editor"><div className="review-summary"><span>신규 <b>{totals.new}</b></span><span>중복 <b>{totals.duplicate}</b></span><span>변경 <b>{totals.changed}</b></span></div><p className="helper">중복은 건너뛰고 변경은 기존 출연진을 갱신해요. 원본과 모든 값을 확인해주세요.</p>
 {reviewRows.map((row,index)=>{const status=classify(row,baseline);const old=baseline.find(s=>s.starts_at===row.starts_at);const isExcluded=excluded.includes(row.id);const rowError=errors[included.indexOf(row)]||[];return <fieldset className={`review-row ${isExcluded?'excluded':''}`} key={row.id}><legend>{index+1}번 회차 · {labels[status]}</legend><label className="include-row"><input type="checkbox" checked={!isExcluded} onChange={()=>setExcluded(old=>isExcluded?old.filter(id=>id!==row.id):[...old,row.id])}/>이 회차 포함</label><div className="two-columns"><label>날짜<input type="date" value={datePart(row.starts_at)} disabled={isExcluded||busy} onChange={e=>edit(row.id,'date',e.target.value)}/></label><label>시간<input type="time" value={timePart(row.starts_at)} disabled={isExcluded||busy} onChange={e=>edit(row.id,'time',e.target.value)}/></label></div><div className="two-columns">{row.cast.map(c=><label key={c.role}>{c.role}<input aria-label={`${index+1}번 ${c.role} 배우`} value={c.actor} disabled={isExcluded||busy} maxLength={80} onChange={e=>edit(row.id,'cast',e.target.value,c.role)}/>{status==='changed'&&old?.cast.find(o=>o.role===c.role)?.actor!==c.actor&&<span className="previous">기존: {old?.cast.find(o=>o.role===c.role)?.actor||'없음'}</span>}</label>)}</div>{row.warnings?.map((w,i)=><p className="warning" key={i}>{w}</p>)}{rowError.map(e=><p className="error" key={e}>{e}</p>)}</fieldset>})}
 <button className="secondary full" onClick={addRow} disabled={busy}><Icon name="plus" size={16}/>회차 추가</button><div className="review-actions"><button className="secondary" disabled={busy} onClick={()=>setRows(null)}>돌아가기</button><button className="primary" disabled={busy||!included.length||errors.some(e=>e.length)} onClick={save}>{busy?'저장 중…':`${included.length}회차 확인 후 저장`}</button></div></div></div>}
 </>}
 </section>
}
function ProductionForm({onCreate}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[poster,setPoster]=useState(null),[preview,setPreview]=useState('');
 useEffect(()=>{if(!poster){setPreview('');return;}const url=URL.createObjectURL(poster);setPreview(url);return()=>URL.revokeObjectURL(url)},[poster]);
 return <form className="panel form-stack" onSubmit={async e=>{
  e.preventDefault();setError('');const form=new FormData(e.currentTarget);
  const title=String(form.get('title')).trim(),venue=String(form.get('venue')).trim();
  if(!title||!venue){setError('작품명과 공연장을 입력해주세요.');return;}
  if(form.get('start_date')>form.get('end_date')){setError('종료일은 시작일 이후여야 해요.');return;}
  if(!poster||!['image/png','image/jpeg','image/webp'].includes(poster.type)||poster.size>8*1024*1024){setError('포스터는 JPG·PNG·WEBP 형식으로 8MB 이하로 올려주세요.');return;}
  const roles=String(form.get('roles')||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(new Set(roles).size!==roles.length||roles.length>30||roles.some(r=>r.length>80)){setError('배역은 중복 없이 최대 30개, 각각 80자 이하로 입력해주세요.');return;}
  setBusy(true);let uploaded;
  try{
   uploaded=await api.uploadPoster(poster);
   await onCreate({title,venue,start_date:form.get('start_date'),end_date:form.get('end_date'),roles,subtitle:'',motif:'moon',poster_url:uploaded.url});
  }catch(e){if(uploaded)await api.removePoster(uploaded.path).catch(()=>{});setError(e.message);}finally{setBusy(false)}
 }}><h2>신규 공연 추가</h2><p className="helper">등록하면 공연 목록에 바로 표시됩니다. 캐스팅 시간표는 이후에 추가할 수 있어요.</p><label>작품명<input name="title" required maxLength={120} disabled={busy}/></label><label>공연장<input name="venue" required maxLength={120} disabled={busy}/></label><div className="two-columns"><label>공연 시작일<input type="date" name="start_date" required disabled={busy}/></label><label>공연 종료일<input type="date" name="end_date" required disabled={busy}/></label></div><label>포스터<input type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy} onChange={e=>setPoster(e.target.files[0]||null)}/></label>{preview&&<img className="source-preview" src={preview} alt="등록할 공연 포스터 미리보기"/>}<details><summary>배역 입력 (선택)</summary><label>배역 · 쉼표로 구분<input name="roles" placeholder="엘리자벳, 토드, 루케니" disabled={busy}/></label></details>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'등록 중…':'공연 등록 · 사이트에 게시'}</button></form>
}
