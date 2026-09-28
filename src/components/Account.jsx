import {useState} from 'react';
import NicknameField from './NicknameField';
import * as api from '../lib/api';
export default function Account({profile,onSaved}){
 const [nickname,setNickname]=useState(profile?.nickname||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 return <section className="page narrow"><h1>닉네임 설정</h1><p className="intro-copy">시간표 제보에 표시할 닉네임을 정해주세요.</p><form className="panel form-stack" onSubmit={async e=>{e.preventDefault();setError('');if(nickname.trim().length<2){setError('닉네임은 2~12자로 입력해주세요.');return;}setBusy(true);try{await api.saveNickname(nickname);await onSaved();setSaved(true);}catch(e){setError(e.message)}finally{setBusy(false)}}}><NicknameField value={nickname} onChange={value=>{setNickname(value);setSaved(false);}} disabled={busy}/>{error&&<p role="alert" className="error">{error}</p>}{saved&&<p role="status">닉네임을 저장했어요.</p>}<button className="primary" disabled={busy}>{busy?'저장 중…':'닉네임 저장'}</button></form></section>;
}
