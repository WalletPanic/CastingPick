export function readLocal(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}}
export function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{throw new Error('브라우저 저장 공간에 접근할 수 없어요. 저장 공간 설정을 확인해주세요.');}}
