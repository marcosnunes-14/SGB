import {cookies} from 'next/headers';
import {database} from '@/db/raw';
import {COOKIE,digest,hex,passwordHash,getUser} from '../../auth';
import {SGB_VERSION} from '../../version';

export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
const schoolFields=['name','library_name','city','state','contact_name','contact_phone','contact_email','status','license_start','license_end'] as const;
const required=(v:unknown,label:string,max=150)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(`Informe ${label}.`);return v.trim()};
const optional=(v:unknown,max=1000)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error('Campo inválido.');return v.trim()};
function schoolInput(input:Record<string,unknown>){
 const gre=Number(input.gre);if(typeof input.gre!=='string'||!/^([1-9]|1\d|2[01])$/.test(input.gre))throw Error('Selecione uma GRE de 01 a 21.');
 const status=required(input.status,'o status',20);if(!['ativa','inativa','suspensa'].includes(status))throw Error('Status inválido.');
 const start=required(input.license_start,'o início da licença',10),end=required(input.license_end,'o vencimento da licença',10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start)throw Error('Confira as datas da licença.');
 const fields:Record<(typeof schoolFields)[number],string>={name:required(input.name,'o nome da escola'),library_name:required(input.library_name,'o nome da biblioteca'),city:required(input.city,'a cidade'),state:required(input.state,'o estado',50),contact_name:required(input.contact_name,'o nome do responsável'),contact_phone:optional(input.contact_phone,50),contact_email:optional(input.contact_email,200),status,license_start:start,license_end:end};
 if(fields.contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contact_email))throw Error('E-mail inválido.');
 return {gre,values:schoolFields.map(field=>fields[field])};
}
function apiError(e:unknown){const message=e instanceof Error?e.message:'';if(/UNIQUE|constraint/i.test(message))return Response.json({error:'Já existe uma escola com esse código ou um usuário com esse login.'},{status:409,headers:noStore});console.error('Admin error',e);return Response.json({error:message||'Não foi possível concluir a operação.'},{status:400,headers:noStore})}

export async function GET(){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente.'},{status:401});if(user.role!=='desenvolvedor')return Response.json({error:'Acesso restrito.'},{status:403});
 try{const db=database();const [schools,users,logs]=await Promise.all([
  db.prepare(`SELECT i.*, (SELECT COUNT(*) FROM users u WHERE u.owner=i.id AND u.role!='desenvolvedor') AS users_count,
    (SELECT COUNT(*) FROM books b WHERE b.owner=i.id) AS books_count,
    (SELECT COALESCE(SUM(CAST(json_extract(b.data,'$.copies') AS INTEGER)),0) FROM books b WHERE b.owner=i.id) AS copies_count,
    (SELECT COUNT(*) FROM loans l WHERE l.owner=i.id) AS loans_count,
    (SELECT COUNT(*) FROM loans l WHERE l.owner=i.id AND json_extract(l.data,'$.status')!='Devolvido') AS active_loans,
    (SELECT COUNT(*) FROM loans l WHERE l.owner=i.id AND json_extract(l.data,'$.status')!='Devolvido' AND json_extract(l.data,'$.due')<date('now')) AS late_loans,
    (SELECT COUNT(DISTINCT lower(trim(json_extract(l.data,'$.student')))||'|'||lower(trim(json_extract(l.data,'$.grade')))) FROM loans l WHERE l.owner=i.id) AS students_count,
    (SELECT COUNT(DISTINCT json_extract(b.data,'$.rack')||'-'||json_extract(b.data,'$.shelf')) FROM books b WHERE b.owner=i.id) AS shelves_count,
    (SELECT MAX(u.last_login_at) FROM users u WHERE u.owner=i.id AND u.role!='desenvolvedor') AS last_access
   FROM institutions i ORDER BY i.created_at, i.code`).all(),
  db.prepare("SELECT id,username,display_name,owner,role,active,email,phone,last_login_at FROM users ORDER BY username").all(),
  db.prepare('SELECT id,institution_id,user_id,action,details,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100').all()
 ]);return Response.json({schools:schools.results,users:users.results,logs:logs.results,version:SGB_VERSION,checkedAt:new Date().toISOString(),supportMode:user.supportMode},{headers:noStore});
 }catch(e){console.error('Admin list failed',e);return Response.json({error:'Não foi possível consultar as escolas.'},{status:503,headers:noStore})}
}

export async function POST(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente.'},{status:401});if(user.role!=='desenvolvedor')return Response.json({error:'Acesso restrito.'},{status:403});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{
  const input=await req.json() as Record<string,unknown>;const action=input.action;const db=database();
  if(action==='create-school'){
   const {gre,values}=schoolInput(input),name=values[0],id=crypto.randomUUID();
   const code=(await db.prepare("SELECT printf('SGB-%04d',COALESCE(MAX(CAST(substr(code,5) AS INTEGER)),0)+1) AS code FROM institutions WHERE code GLOB 'SGB-[0-9]*'").first<{code:string}>())?.code||'SGB-0001';
   await db.batch([db.prepare(`INSERT INTO institutions(id,code,gre,${schoolFields.join(',')}) VALUES(${Array(schoolFields.length+3).fill('?').join(',')})`).bind(id,code,gre,...values),db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,user.id,'escola_criada',name)]);
   return Response.json({ok:true,id,code},{headers:noStore});
  }
  if(action==='update-school'){
   const id=required(input.id,'a escola',80);const exists=await db.prepare('SELECT id FROM institutions WHERE id=?').bind(id).first();if(!exists)return Response.json({error:'Escola não encontrada.'},{status:404});
   const {gre,values}=schoolInput(input);
   await db.batch([db.prepare(`UPDATE institutions SET gre=?,${schoolFields.map(key=>`${key}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(gre,...values,id),db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(),id,user.id,'escola_alterada')]);
   return Response.json({ok:true},{headers:noStore});
  }
  if(action==='create-user'){
   const institutionId=required(input.institutionId,'a escola',80);const school=await db.prepare('SELECT id FROM institutions WHERE id=?').bind(institutionId).first();if(!school)return Response.json({error:'Escola não encontrada.'},{status:404});
   const username=required(input.username,'o login',50).toLowerCase();if(!/^[a-z0-9._-]{3,50}$/.test(username))throw Error('Login inválido.');
   const role=optional(input.role,30)||'bibliotecario';if(!['bibliotecario','direcao'].includes(role))throw Error('Perfil inválido.');
   const password=required(input.password,'a senha inicial',128);if(password.length<10)throw Error('A senha deve ter pelo menos 10 caracteres.');
   const salt=hex(crypto.getRandomValues(new Uint8Array(24)).buffer);
   const id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO users(id,username,owner,salt,hash,role,email,phone,display_name) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,username,institutionId,salt,await passwordHash(password,salt),role,optional(input.email,200),optional(input.phone,50),required(input.display_name,'o nome',150)),db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),institutionId,user.id,'usuario_criado',username)]);
   return Response.json({ok:true,id},{headers:noStore});
  }
  if(action==='update-user'||action==='reset-password'){
   const id=required(input.id,'o usuário',80);const target=await db.prepare("SELECT id,owner,role FROM users WHERE id=? AND role!='desenvolvedor'").bind(id).first<{id:string;owner:string;role:string}>();if(!target)return Response.json({error:'Usuário não encontrado.'},{status:404});
   if(action==='reset-password'){const password=required(input.password,'a senha',128);if(password.length<10)throw Error('A senha deve ter pelo menos 10 caracteres.');const salt=hex(crypto.getRandomValues(new Uint8Array(24)).buffer);await db.batch([db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').bind(salt,await passwordHash(password,salt),id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id)]);}
   else{const role=optional(input.role,30)||target.role;if(!['bibliotecario','direcao'].includes(role))throw Error('Perfil inválido.');await db.prepare('UPDATE users SET role=?,active=?,email=?,phone=?,display_name=? WHERE id=?').bind(role,input.active===false?0:1,optional(input.email,200),optional(input.phone,50),required(input.display_name,'o nome',150),id).run();if(input.active===false)await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();}
   await db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),target.owner,user.id,action==='reset-password'?'senha_redefinida':'usuario_alterado',id).run();
   return Response.json({ok:true},{headers:noStore});
  }
  if(action==='enter-support'||action==='exit-support'){
   const token=(await cookies()).get(COOKIE)?.value;if(!token)return Response.json({error:'Sessão expirada.'},{status:401});const hash=await digest(token);
   if(action==='enter-support'){const institutionId=required(input.institutionId,'a escola',80);const school=await db.prepare('SELECT name FROM institutions WHERE id=?').bind(institutionId).first<{name:string}>();if(!school)return Response.json({error:'Escola não encontrada.'},{status:404});await db.prepare('UPDATE sessions SET support_institution=? WHERE token_hash=? AND user_id=?').bind(institutionId,hash,user.id).run();await db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),institutionId,user.id,'suporte_iniciado',school.name).run();}
   else{if(user.supportMode&&user.institutionId)await db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.institutionId,user.id,'suporte_encerrado').run();await db.prepare('UPDATE sessions SET support_institution=NULL WHERE token_hash=? AND user_id=?').bind(hash,user.id).run();}
   return Response.json({ok:true},{headers:noStore});
  }
  return Response.json({error:'Ação desconhecida.'},{status:400});
 }catch(e){return apiError(e)}
}
