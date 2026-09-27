export function isExistingSignup(data){
 const user=data?.user??data;
 return !data?.access_token&&Array.isArray(user?.identities)&&user.identities.length===0;
}
export function isExistingAccountError(error){
 return ['user_already_exists','email_exists'].includes(error?.code)||/^(user already registered|user already exists|email already exists)\.?$/i.test(error?.message??'');
}
