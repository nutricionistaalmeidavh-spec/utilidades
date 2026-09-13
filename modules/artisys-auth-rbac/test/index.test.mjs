import test from 'node:test';
import assert from 'node:assert/strict';
import {createPolicy,can,requirePermission,createLocalUser,verifyLocalPassword,createLocalSession,verifyLocalSession,revokeLocalSession} from '../src/index.mjs';

test('evaluates role permissions',()=>{const p=createPolicy({admin:['*'],cashier:['sale:create']});assert.equal(can(p,'cashier','sale:create'),true);assert.equal(can(p,'cashier','users:delete'),false);assert.throws(()=>requirePermission(p,'cashier','users:delete'),{code:'FORBIDDEN'});});

test('authenticates local users with salted scrypt hashes',()=>{const user=createLocalUser({id:'u1',username:'Admin',password:'abcdefgh',roles:['admin']},{salt:'00112233445566778899aabbccddeeff'});assert.notEqual(user.passwordHash,'abcdefgh');assert.equal(verifyLocalPassword(user,'abcdefgh'),true);assert.equal(verifyLocalPassword(user,'abcdefghx'),false);});

test('expires and revokes local sessions',()=>{const user=createLocalUser({id:'u1',username:'admin',password:'abcdefgh',roles:['admin']},{salt:'00112233445566778899aabbccddeeff'});const {token,session}=createLocalSession(user,{id:'s1',token:'tok',issuedAt:'2026-01-01T00:00:00Z',expiresAt:'2026-01-01T01:00:00Z'});assert.equal(verifyLocalSession(session,token,{now:'2026-01-01T00:30:00Z'}),true);assert.equal(verifyLocalSession(session,token,{now:'2026-01-01T02:00:00Z'}),false);assert.equal(verifyLocalSession(revokeLocalSession(session,{at:'2026-01-01T00:20:00Z'}),token,{now:'2026-01-01T00:30:00Z'}),false);});

test('short invalid password returns false instead of throwing',()=>{const user=createLocalUser({id:'u2',username:'x',password:'abcdefgh',roles:[]},{salt:'00112233445566778899aabbccddeeff'});assert.equal(verifyLocalPassword(user,'bad'),false);});
