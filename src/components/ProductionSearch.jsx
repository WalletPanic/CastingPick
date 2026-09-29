import {useId,useState} from 'react';
export default function ProductionSearch({productions,value,onChange,disabled}){
 const id=useId(),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const selected=productions.find(p=>p.id===value);
 const normalize=text=>text.toLocaleLowerCase().replace(/\s/g,'');
 const results=productions.filter(p=>normalize(`${p.title} ${p.venue}`).includes(normalize(query)));
 function choose(p){onChange(p.id);setOpen(false);setQuery('');setActive(-1);}
 return <div className="production-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setQuery('');setActive(-1);}}}>
 <label htmlFor={id}>공연 선택</label>
 <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open&&!disabled} aria-controls={`${id}-list`} aria-activedescendant={open&&active>=0?`${id}-${active}`:undefined} autoComplete="off" disabled={disabled} placeholder="작품명 또는 공연장 검색" value={open?query:selected?`${selected.title} · ${selected.venue}`:''} onFocus={()=>{setOpen(true);setQuery('');setActive(-1);}} onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(-1);}} onKeyDown={e=>{
 if(e.key==='Escape'){setOpen(false);setQuery('');setActive(-1);}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>results.length?(e.key==='ArrowDown'?Math.min(i+1,results.length-1):Math.max(i-1,0)):-1);}
 if(e.key==='Enter'&&open){e.preventDefault();if(active>=0&&results[active])choose(results[active]);else if(results.length===1)choose(results[0]);}
 }}/>
 {open&&!disabled&&<div className="production-search-results" id={`${id}-list`} role="listbox" aria-label="공연 검색 결과">{results.map((p,i)=><button id={`${id}-${i}`} type="button" role="option" aria-selected={active===i} className={active===i?'active':''} key={p.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(p)}><strong>{p.title}</strong><span>{p.venue} · {p.start_date} ~ {p.end_date}</span></button>)}{!results.length&&<p role="status">일치하는 공연이 없습니다. ‘공연 추가’로 등록해주세요.</p>}</div>}
 {open&&selected&&<p className="helper">현재 선택: {selected.title} · 검색 결과를 선택하면 변경됩니다.</p>}
 </div>;
}
