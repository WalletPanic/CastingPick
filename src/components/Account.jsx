import {useState} from 'react';
import * as api from '../lib/api';
export default function Account({profile,onSaved}){
 const [nickname,setNickname]=useState(profile?.nickname||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 return <section className="page narrow"><h1>{profile?.nickname?'내 계정':'닉네임 설정'}</h1><p className="intro-copy">시간표 제보에 표시할 닉네임을 정해주세요. 언제든 변경할 수 있어요.</p><form className="panel form-stack" onSubmit={async e=>{e.preventDefault();setError('');if(nickname.trim().length<2){setError('닉네임은 2~20자로 입력해주세요.');return;}setBusy(true);try{await api.saveNickname(nickname);await onSaved();setSaved(true);}catch(e){setError(e.message)}finally{setBusy(false)}}}><label>닉네임<input value={nickname} onChange={e=>setNickname(e.target.value)} required minLength={2} maxLength={20} disabled={busy}/></label>{error&&<p role="alert" className="error">{error}</p>}{saved&&<p role="status">닉네임을 저장했어요.</p>}<button className="primary" disabled={busy}>{busy?'저장 중…':'닉네임 저장'}</button></form></section>;
}
