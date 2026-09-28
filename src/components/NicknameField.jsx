import {useState,useId} from 'react';
import * as api from '../lib/api';
export default function NicknameField({value,onChange,disabled}){
 const [local,setLocal]=useState(''),[checking,setChecking]=useState(false),[message,setMessage]=useState('');
 const nickname=value??local;const inputId=useId();
 return <div className="form-stack"><label htmlFor={inputId}>닉네임 (2~12자)</label><div className="nickname-input-wrap"><input id={inputId} name="nickname" value={nickname} onChange={e=>{setLocal(e.target.value);onChange?.(e.target.value);setMessage('');}} required minLength={2} maxLength={12} disabled={disabled} readOnly={checking} placeholder="닉네임을 입력해주세요"/><button type="button" className="nickname-check" disabled={disabled||checking||nickname.trim().length<2||nickname.trim().length>12} onClick={async()=>{setChecking(true);setMessage('');try{setMessage(await api.nicknameAvailable(nickname)?'사용 가능한 닉네임입니다.':'이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');}catch(e){setMessage(e.message)}finally{setChecking(false)}}}>{checking?'확인 중…':'중복 확인'}</button></div><p className="helper">한 번 설정한 닉네임은 변경할 수 없습니다. 신중하게 입력해주세요.</p>{message&&<p role="status" className="helper">{message}</p>}</div>;
}
