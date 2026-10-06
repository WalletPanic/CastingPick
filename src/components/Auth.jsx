import {useState} from 'react';
import {isExistingAccountError} from '../lib/auth.js';
import NicknameField from './NicknameField';
import * as api from '../lib/api';
export default function Auth({onDone,reason='로그인하고 관심 회차와 시간표를 관리하세요.'}){
 const [signup,setSignup]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(api.emailLinkMessage);
 const [help,setHelp]=useState(null);
 if(help)return <EmailHelp initialMode={help} onBack={()=>setHelp(null)}/>;
 return <section className="page narrow"><div className="eyebrow">MY CASTING PICK</div><h1>{signup?'회원가입':'로그인'}</h1><p className="intro-copy">{reason}</p>{!api.configured?<p className="error">미리보기에서는 로그인할 수 없습니다. Supabase 연결이 필요합니다.</p>:<form className="panel form-stack" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);setBusy(true);setError('');setMessage('');try{if(signup){await api.signUp(data.get('email').trim(),data.get('password'),data.get('nickname').trim());if(api.getSession())onDone();else setMessage('인증 대기 상태로 접수되었습니다. 가입 확인 메일의 링크를 눌러 인증해야 로그인할 수 있습니다.');}else{await api.signIn(data.get('email').trim(),data.get('password'));onDone();}}catch(e){if(signup&&isExistingAccountError(e)){setSignup(false);setMessage('이미 가입된 계정입니다. 로그인해주세요.');form.elements.password.value='';form.elements.password.focus();}else setError(e.code==='email_not_confirmed'?'이메일 인증이 완료되지 않았습니다. 가입 확인 메일의 링크를 누른 뒤 로그인해주세요.':e.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(e.message)?'인증 이메일 발송 한도에 도달했습니다. 잠시 후 다시 시도해주세요.':e.message)}finally{setBusy(false)}}}><>{signup&&<NicknameField disabled={busy}/>}</><label>이메일<input name="email" type="email" autoComplete="email" required disabled={busy}/></label><label>비밀번호<input name="password" type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?8:undefined} required disabled={busy}/></label>{signup&&<p className="helper">비밀번호는 8자 이상 입력해주세요.</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<button className="primary" disabled={busy}>{busy?'처리 중…':signup?'가입하기':'로그인'}</button><button type="button" className="text-button" disabled={busy} onClick={()=>{setSignup(!signup);setError('');setMessage('')}}>{signup?'이미 계정이 있어요 · 로그인':'계정이 없어요 · 회원가입'}</button><button type="button" className="text-button" disabled={busy} onClick={()=>setHelp('recovery')}>비밀번호를 잊으셨나요?</button><button type="button" className="text-button" disabled={busy} onClick={()=>setHelp('signup')}>인증 메일 재발송</button></form>}<a className="text-button" href="#/">로그인 없이 공연 둘러보기</a></section>
}

function friendlyError(error){
 if(error.code==='over_email_send_rate_limit'||error.code==='over_request_rate_limit'||/rate limit|too many/i.test(error.message))return '메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
 if(/jwt|expired|invalid token|session.*missing/i.test(error.message))return '재설정 링크가 만료되었거나 유효하지 않습니다. 로그인 화면에서 메일을 다시 요청해주세요.';
 if(error.code==='same_password')return '기존 비밀번호와 다른 비밀번호를 입력해주세요.';
 return error.message;
}
export function EmailHelp({initialMode='recovery',onBack}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 const recovery=initialMode==='recovery';
 return <section className="page narrow"><h1>{recovery?'비밀번호 찾기':'인증 메일 재발송'}</h1><p className="intro-copy">가입할 때 사용한 이메일을 입력해주세요.</p><form className="panel form-stack" onSubmit={async e=>{e.preventDefault();const email=new FormData(e.currentTarget).get('email').trim();setBusy(true);setError('');try{await api.sendAccountEmail(email,initialMode);setSent(true)}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}}><label>이메일<input type="email" name="email" autoComplete="email" required disabled={busy||sent}/></label>{sent&&<p role="status">{recovery?'등록된 계정이라면 비밀번호 재설정 메일이 발송됩니다.':'인증 대기 중인 계정이라면 가입 확인 메일이 발송됩니다.'} 스팸함도 확인해주세요.</p>}{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy||sent}>{busy?'발송 중…':sent?'메일 요청 완료':recovery?'재설정 메일 보내기':'인증 메일 다시 보내기'}</button><button type="button" className="text-button" disabled={busy} onClick={onBack}>로그인으로 돌아가기</button></form></section>
}
export function ResetPassword(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 if(done)return <section className="page narrow"><h1>비밀번호 변경 완료</h1><p role="status">새 비밀번호로 로그인해주세요.</p><a className="primary" href="#/login">로그인</a></section>;
 if(!api.hasRecoveryToken())return <EmailHelp onBack={()=>{location.hash='/login'}}/>;
 return <section className="page narrow"><h1>새 비밀번호 설정</h1><form className="panel form-stack" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);setError('');if(data.get('password')!==data.get('confirm')){setError('비밀번호가 일치하지 않습니다.');return;}setBusy(true);try{await api.resetPassword(data.get('password'));setDone(true)}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}}><label>새 비밀번호<input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label><label>새 비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label><p className="helper">비밀번호는 8자 이상 입력해주세요.</p>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'변경 중…':'비밀번호 변경'}</button><a className="text-button" href="#/login">로그인으로 돌아가기</a></form></section>
}
