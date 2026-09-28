import {useState} from 'react';
import * as api from '../lib/api';
export default function NicknameField({value,onChange,disabled}){
 const [local,setLocal]=useState(''),[checking,setChecking]=useState(false),[message,setMessage]=useState('');
 const nickname=value??local;
 return <div className="form-stack"><label>닉네임<input name="nickname" value={nickname} onChange={e=>{setLocal(e.target.value);onChange?.(e.target.value);setMessage('');}} required minLength={2} maxLength={20} disabled={disabled} readOnly={checking} placeholder="2~20자"/></label><button type="button" className="secondary" disabled={disabled||checking||nickname.trim().length<2} onClick={async()=>{setChecking(true);setMessage('');try{setMessage(await api.nicknameAvailable(nickname)?'사용 가능한 닉네임입니다.':'이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');}catch(e){setMessage(e.message)}finally{setChecking(false)}}}>{checking?'확인 중…':'닉네임 중복 확인'}</button>{message&&<p role="status" className="helper">{message}</p>}<p className="helper">영문 대소문자와 앞뒤 공백은 구분하지 않습니다.</p></div>;
}
