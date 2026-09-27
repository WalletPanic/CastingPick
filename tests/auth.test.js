import test from 'node:test';
import assert from 'node:assert/strict';
import {isExistingSignup,isExistingAccountError} from '../src/lib/auth.js';
test('recognizes duplicate signup in both REST response shapes without confusing a new signup',()=>{
 assert.equal(isExistingSignup({id:'existing',identities:[]}),true);
 assert.equal(isExistingSignup({user:{identities:[]}}),true);
 assert.equal(isExistingSignup({identities:[{id:'email'}]}),false);
 assert.equal(isExistingSignup({user:{identities:[{id:'email'}]}}),false);
 assert.equal(isExistingSignup({access_token:'session',user:{identities:[]}}),false);
 assert.equal(isExistingSignup({}),false);
});
test('only existing-account errors trigger login instead of hiding other errors',()=>{
 for(const code of ['user_already_exists','email_exists']) assert.equal(isExistingAccountError({code}),true);
 assert.equal(isExistingAccountError(new Error('User already registered')),true);
 for(const message of ['Email rate limit exceeded','Failed to fetch','Invalid login credentials']) assert.equal(isExistingAccountError(new Error(message)),false);
});
