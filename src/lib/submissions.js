export function validSubmissionSource(value){
 if(typeof value!=='string'||value.length>2000||/\s/.test(value))return false;
 try{const url=new URL(value);return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password;}catch{return false;}
}
