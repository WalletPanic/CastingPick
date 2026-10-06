import {Fragment,useEffect,useRef,useState} from 'react';
export default function ProductionDate({name,defaultValue='',disabled,required}){
 const [parts,setParts]=useState(defaultValue?defaultValue.split('-'):['','','']);const refs=[useRef(null),useRef(null),useRef(null)];
 const full=parts[0].length===4&&parts[1]&&parts[2]?`${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`:'';
 function change(i,value){const next=[...parts];next[i]=value.replace(/\D/g,'').slice(0,i===0?4:2);setParts(next);refs[2].current?.setCustomValidity('');if(next[i].length===(i===0?4:2)&&i<2){refs[i+1].current?.focus();refs[i+1].current?.select();}}
 function validate(){const valid=!full||(!Number.isNaN(Date.parse(full))&&new Date(full+'T12:00:00Z').toISOString().slice(0,10)===full&&Number(parts[0])>0);refs[2].current?.setCustomValidity(valid?'':'올바른 날짜를 입력해주세요.');}
 useEffect(validate,[full]);
 return <span className="production-date"><input type="hidden" name={name} value={full}/>{['연도','월','일'].map((label,i)=><Fragment key={label}>{i>0&&<span aria-hidden="true">/</span>}<input ref={refs[i]} aria-label={`${name==='start_date'?'시작일':'종료일'} ${label}`} inputMode="numeric" placeholder={['YYYY','MM','DD'][i]} maxLength={i===0?4:2} pattern={i===0?'[0-9]{4}':i===1?'(0?[1-9]|1[0-2])':'(0?[1-9]|[12][0-9]|3[01])'} value={parts[i]} onChange={e=>change(i,e.target.value)} onBlur={validate} disabled={disabled} required={required}/></Fragment>)}</span>;
}
