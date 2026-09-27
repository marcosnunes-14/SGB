import { cookies } from 'next/headers';
import { database } from '@/db/raw';
export const COOKIE='sgb_session';
export const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
export function equal(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
export async function getUser(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;
 const user=await database().prepare("SELECT u.id,u.username,u.display_name,u.role,u.owner,u.active,s.support_institution,i.status AS institution_status,i.name AS institution_name FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN institutions i ON i.id=CASE WHEN u.role='desenvolvedor' THEN s.support_institution ELSE u.owner END WHERE s.token_hash=? AND CAST(s.expires AS INTEGER)>?").bind(await digest(token),Date.now()).first<{id:string;username:string;display_name:string;role:string;owner:string;active:number;support_institution:string|null;institution_status:string|null;institution_name:string|null}>();
 if(!user||!user.active)return null;
 const supportMode=user.role==='desenvolvedor'&&!!user.support_institution;
 if(user.role!=='desenvolvedor'&&user.institution_status!=='ativa')return null;
 if(supportMode&&!user.institution_status)return null;
 return {id:user.id,username:user.display_name||user.username,role:user.role,userId:supportMode?user.support_institution!:user.owner,institutionId:user.role==='desenvolvedor'&&!supportMode?null:supportMode?user.support_institution!:user.owner,institutionName:user.institution_name,supportMode};
}
