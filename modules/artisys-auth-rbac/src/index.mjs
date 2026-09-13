import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';

export function createPolicy(definition = {}) {return Object.freeze(Object.fromEntries(Object.entries(definition).map(([role, permissions]) => [role, new Set(permissions)])));}
export function can(policy, roles, permission) {const list = Array.isArray(roles) ? roles : [roles];return list.some(role => policy?.[role]?.has('*') || policy?.[role]?.has(permission));}
export function requirePermission(policy, roles, permission) {if (!can(policy,roles,permission)) { const error = new Error(`permission denied: ${permission}`); error.code='FORBIDDEN'; throw error; }return true;}

const text=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} is required`);return v.trim()};
const password=(v)=>{if(typeof v!=='string'||v.length<8)throw new TypeError('password must have at least 8 characters');return v};
const tokenHash=(token)=>createHash('sha256').update(token).digest('hex');

export function createLocalUser({id,username,password:rawPassword,roles=[],active=true,metadata={}}={},options={}){
  const salt=options.salt??randomBytes(16).toString('hex');
  const hash=scryptSync(password(rawPassword),salt,64).toString('hex');
  return Object.freeze({id:text(id,'user id'),username:text(username,'username').toLowerCase(),passwordSalt:salt,passwordHash:hash,roles:Object.freeze([...new Set(roles.map(String))]),active:Boolean(active),metadata:Object.freeze({...metadata})});
}
export function verifyLocalPassword(user,rawPassword){if(!user?.active||typeof rawPassword!=='string'||rawPassword.length<8)return false;const actual=Buffer.from(user.passwordHash,'hex');const candidate=scryptSync(rawPassword,user.passwordSalt,actual.length);return actual.length===candidate.length&&timingSafeEqual(actual,candidate);}
export function changeLocalPassword(user,rawPassword,options={}){const next=createLocalUser({...user,password:rawPassword},options);return Object.freeze({...next,id:user.id,username:user.username,roles:user.roles,active:user.active,metadata:user.metadata});}
export function createLocalSession(user,{id=randomUUID(),token=randomBytes(32).toString('hex'),issuedAt=new Date().toISOString(),expiresAt=null}={}){if(!user?.active)throw new Error('inactive user cannot start session');const issued=new Date(issuedAt).toISOString();const expiry=expiresAt==null?new Date(Date.parse(issued)+8*60*60*1000).toISOString():new Date(expiresAt).toISOString();if(Date.parse(expiry)<=Date.parse(issued))throw new Error('session expiry must be after issue');return Object.freeze({token,session:Object.freeze({id:text(id,'session id'),userId:user.id,roles:Object.freeze([...user.roles]),tokenHash:tokenHash(token),issuedAt:issued,expiresAt:expiry,revokedAt:null})});}
export function verifyLocalSession(session,token,{now=new Date().toISOString()}={}){if(!session||session.revokedAt)return false;if(Date.parse(now)>=Date.parse(session.expiresAt))return false;const a=Buffer.from(session.tokenHash,'hex');const b=Buffer.from(tokenHash(String(token)),'hex');return a.length===b.length&&timingSafeEqual(a,b);}
export function requireLocalSession(session,token,options={}){if(!verifyLocalSession(session,token,options)){const error=new Error('authentication required');error.code='UNAUTHENTICATED';throw error;}return session;}
export function revokeLocalSession(session,{at=new Date().toISOString()}={}){return Object.freeze({...session,revokedAt:new Date(at).toISOString()});}
