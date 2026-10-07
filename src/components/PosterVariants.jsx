import {useEffect,useState} from 'react';
import * as api from '../lib/api';
export function initialPosters(p={}){return {original:p.poster_original_url??(p.poster_variant==='illustrated'?'':p.poster_url??''),illustrated:p.poster_illustrated_url??'',active:p.poster_variant??'original',files:{}}}
export async function uploadPosters(value,uploads){
 const urls={original:value.original,illustrated:value.illustrated};
 for(const kind of ['original','illustrated'])if(value.files[kind]){const f=value.files[kind];if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)throw new Error('포스터는 JPG·PNG·WEBP, 8MB 이하로 올려주세요.');}
 if(!urls[value.active]&&!value.files[value.active])throw new Error('공개할 버전의 포스터를 먼저 등록해주세요.');
 for(const kind of ['original','illustrated'])if(value.files[kind]){const uploaded=await api.uploadPoster(value.files[kind]);uploads.push(uploaded);urls[kind]=uploaded.url;}
 return {poster_original_url:urls.original||null,poster_illustrated_url:urls.illustrated||null,poster_variant:value.active,poster_url:urls[value.active]};
}
function PosterSlot({kind,title,value,onChange,disabled}){
 const [preview,setPreview]=useState(value[kind]);const file=value.files[kind];
 useEffect(()=>{if(!file){setPreview(value[kind]);return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file,value[kind]]);
 return <div className="poster-variant"><label className="checkbox-label"><input type="radio" name="poster-variant" value={kind} checked={value.active===kind} disabled={disabled} onChange={()=>onChange({...value,active:kind})}/>{title}{value.active===kind?' · 공개 선택':''}</label>{preview?<img src={preview} alt={title+' 미리보기'}/>:<div className="poster-empty">이미지 미등록</div>}<label>{title} {preview?'교체':'등록'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={e=>onChange({...value,files:{...value.files,[kind]:e.target.files[0]||null}})}/></label></div>
}
export default function PosterVariants({value,onChange,disabled}){return <fieldset className="poster-settings" disabled={disabled}><legend>포스터 관리</legend><p className="helper">두 버전을 보관하고 공개할 포스터를 선택하세요. 저장하면 공연 목록과 상세 화면에 반영됩니다.</p><div className="poster-variants">{[['original','원본 포스터'],['illustrated','직접 그린 포스터']].map(([kind,title])=><PosterSlot key={kind} {...{kind,title,value,onChange,disabled}}/>)}</div></fieldset>}
