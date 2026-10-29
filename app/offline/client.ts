import {applyOperation,bases,emptySnapshot,type Operation,type Profile,type Snapshot,type Row} from './model';
import {listProfiles,deriveKey,seal,unseal,saveEnvelope,newSalt,type Envelope,type Vault} from './vault';
import {compareRegistrations} from '../registration-order';
import {studentKey,studentCode} from '../student-identity';
import {summarizeReadingDashboard} from '../dashboard-data';
export type Status={pending:number;expired:boolean;online:boolean;syncing:boolean;message:string;conflict:boolean;syncedAt:string};
export class OfflineClient{
 vault:Vault;private key:CryptoKey;private envelope:Envelope;private nativeFetch:typeof fetch;private writing:Promise<unknown>=Promise.resolve();private syncing=false;private stopped=false;private listeners=new Set<()=>void>();private timer:ReturnType<typeof setTimeout>|undefined;online=navigator.onLine;message='';
 constructor(vault:Vault,key:CryptoKey,envelope:Envelope,nativeFetch:typeof fetch){this.vault=vault;this.key=key;this.envelope=envelope;this.nativeFetch=nativeFetch}
 static async prepare(user:Profile,snapshot:Snapshot,syncedAt:string,password:string,nativeFetch:typeof fetch){if(password.length<8)throw Error('Use uma senha local de pelo menos 8 caracteres.');const id=user.id+':'+user.institutionId;if((await listProfiles()).some(p=>p.id===id))throw Error('Este perfil já está preparado. Desbloqueie-o com sua senha local.');const metadata:Envelope={id,username:user.username,school:user.institutionName,salt:newSalt(),iv:'',cipher:'',revision:0},key=await deriveKey(password,metadata.salt),vault:Vault={user,snapshot,queue:[],syncedAt};const record=await seal(vault,key,metadata);await saveEnvelope(record,0);return new OfflineClient(vault,key,record,nativeFetch)}
 static async unlock(record:Envelope,password:string,nativeFetch:typeof fetch){const key=await deriveKey(password,record.salt);return new OfflineClient(await unseal(record,key),key,record,nativeFetch)}
 get status():Status{return {pending:this.vault.queue.length,expired:Date.now()>this.vault.user.offlineUntil,online:this.online&&navigator.onLine,syncing:this.syncing,message:this.message,conflict:!!this.vault.conflict,syncedAt:this.vault.syncedAt}}
 subscribe(fn:()=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
 private emit(){for(const fn of this.listeners)fn()}
 private serialize<T>(fn:()=>Promise<T>):Promise<T>{const next=this.writing.then(fn);this.writing=next.catch(()=>{});return next}
 private async persist(vault:Vault){if(this.stopped)throw Error('Aplicativo bloqueado.');const next=await seal(vault,this.key,this.envelope);await saveEnvelope(next,this.envelope.revision);this.envelope=next;this.vault=vault;this.emit()}
 stop(){this.stopped=true;clearTimeout(this.timer);this.listeners.clear()}
 schedule(){clearTimeout(this.timer);if(!this.stopped&&navigator.onLine)this.timer=setTimeout(()=>void this.sync(),500)}
 private async remote(path:string,init?:RequestInit){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);try{const response=await this.nativeFetch(path,{...init,cache:'no-store',signal:abort.signal});this.online=true;return response}catch(e){this.online=false;throw e}finally{clearTimeout(timer)}}
 async bootstrap(){const response=await this.remote('/api/offline');const result=await response.json() as {error?:string;user:Profile;snapshot:Snapshot;syncedAt:string};if(!response.ok)throw Error(result.error||'Não foi possível sincronizar.');if(result.user.id!==this.vault.user.id||result.user.institutionId!==this.vault.user.institutionId)throw Error('Entre no site com o mesmo usuário e escola deste aplicativo.');return result}
 async sync(){
  if(this.syncing||this.stopped)return;this.syncing=true;this.emit();let completed=false;
  try{
   while(this.vault.queue.length&&!this.stopped){
    const operation=this.vault.queue[0];const response=await this.remote('/api/offline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:this.vault.user.userId,actor:this.vault.user.id,operation})});
    const result=await response.json() as {error?:string};if(!response.ok){const message=result.error||'Não foi possível sincronizar.';if(response.status===409)await this.serialize(()=>this.persist({...this.vault,conflict:message}));throw Error(message)}
    await this.serialize(()=>this.persist({...this.vault,queue:this.vault.queue.filter(op=>op.id!==operation.id),conflict:undefined}));
   }
   if(!this.stopped){const remote=await this.bootstrap();await this.serialize(async()=>{if(!this.vault.queue.length)await this.persist({...this.vault,user:remote.user,snapshot:remote.snapshot,syncedAt:remote.syncedAt,conflict:undefined})})}
   completed=true;this.online=true;this.message=this.vault.queue.length?'Há alterações aguardando envio.':'Tudo sincronizado.';
  }catch(e){if(this.stopped)return;this.message=(e as Error).name==='AbortError'?'Sem resposta do servidor. Os dados continuam salvos neste computador.':(e as Error).name==='TypeError'?'Sem conexão com o servidor. As alterações continuam salvas neste computador.':(e as Error).message}finally{this.syncing=false;this.emit();if(completed&&this.vault.queue.length)this.schedule()}
 }
 async resolveConflict(reapply:boolean,replacement?:Record<string,unknown>){
  if(this.syncing)throw Error('Aguarde a sincronização terminar.');this.syncing=true;this.emit();
  try{const remote=await this.bootstrap();await this.serialize(async()=>{
   const queue=structuredClone(this.vault.queue);if(!queue.length)return;
   if(reapply){if(replacement)queue[0].body=structuredClone(replacement);queue[0].base=bases(remote.snapshot,queue[0].body)}else queue.shift();
   let snapshot=remote.snapshot,blocked=false;
   for(let index=0;index<queue.length;index++){try{snapshot=applyOperation(snapshot,queue[index],remote.user)}catch(e){if(index===0&&reapply)throw e;blocked=true;break}}
   await this.persist({...this.vault,user:remote.user,snapshot,queue,conflict:undefined});
   this.message=blocked?'A fila foi preservada. Há outras alterações que precisarão de revisão ao sincronizar.':'Fila revisada. Clique em sincronizar.';
  })}finally{this.syncing=false;this.emit()}
 }

 async mutate(body:Record<string,unknown>){return this.serialize(async()=>{
  if(Date.now()>this.vault.user.offlineUntil)throw Error('O período de acesso offline terminou. Conecte e sincronize para renovar o acesso.');
  const operation:Operation={id:crypto.randomUUID(),at:new Date().toISOString(),body:structuredClone(body),base:bases(this.vault.snapshot,body)},snapshot=applyOperation(this.vault.snapshot,operation,this.vault.user);
  await this.persist({...this.vault,snapshot,queue:[...this.vault.queue,operation]});this.message='Alteração salva no computador e aguardando sincronização.';this.emit();this.schedule();return {ok:true,count:body.action==='clone'?(body.registrations as unknown[]).length:Array.isArray(body.ids)?new Set(body.ids).size:1};
 })}
 fetch:typeof fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin),method=init?.method||(input instanceof Request?input.method:'GET');
  if(url.origin!==location.origin)return this.nativeFetch(input,init);
  const result=(value:unknown,status=200)=>Response.json(value,{status});
  try{
   const state=this.vault.snapshot;
   if(url.pathname==='/api/records'){
    if(method==='POST')return result(await this.mutate(JSON.parse(String(init?.body||'{}'))));
    const id=url.searchParams.get('loanId');if(id){const loan=state.loans.find(r=>r.id===id);if(!loan)return result({error:'Empréstimo não encontrado.'},404);const book=state.books.find(b=>b.registration===String(loan.code||'').trim());return result({loan,location:book?{rack:book.rack,shelf:book.shelf}:null})}
    return result({books:[...state.books].sort((a,b)=>compareRegistrations(String(a.registration),String(b.registration))),loans:state.loans.filter(loan=>url.searchParams.get('pending')!=='1'||loan.status!=='Devolvido')});
   }
   if(url.pathname==='/api/students'){
    const q=studentKey(url.searchParams.get('q')||'');return result({students:state.students.filter(s=>q.length>=2&&studentKey(s.name).startsWith(q)).slice(0,8).map(s=>({id:String(s.id),code:s.id>0?studentCode(s.id):'Aguardando sincronização',name:s.name,grade:s.grade,loansCount:state.loans.filter(l=>Number(l.studentId)===s.id).length}))});
   }
   if(url.pathname==='/api/dashboard'){
    const p=url.searchParams,summary=summarizeReadingDashboard(state.loans.map(l=>({student_id:Number(l.studentId)||null,data:JSON.stringify(l)})),state.students,{start:p.get('start')||'',end:p.get('end')||'',today:p.get('today')||new Date().toLocaleDateString('sv-SE'),status:p.get('status')||'todos',grade:studentKey(p.get('grade')||'')});return result({...summary,topReaders:summary.topReaders.map(s=>({...s,id:/^ALU-0*-/.test(s.id)?'Local-'+s.id.split('-').at(-1):s.id})),availableGrades:[...new Set(state.students.map(s=>s.grade))]});
   }
   if(url.pathname==='/api/labels'){
    if(method==='POST'){const body=JSON.parse(String(init?.body||'{}'));return result(await this.mutate({...body,action:'label-print'}))}
    const labels=state.labels.flatMap(label=>{const book=state.books.find(b=>b.id===label.bookId);return book&&Number(label.copyNumber)<=Number(book.copies||1)?[{...label,title:book.title,authors:book.authors,registration:book.registration}]:[]});return result({school:this.vault.user.institutionName,books:url.searchParams.has('code')?labels.filter(l=>(l as Row).code===url.searchParams.get('code')):labels});
   }
   if(url.pathname==='/api/auth'&&method==='POST'){try{await this.remote('/api/auth',init)}catch{/* O bloqueio local independe da rede. */}return result({ok:true})}
   if(url.pathname.startsWith('/api/')){if(!navigator.onLine)return result({error:'Esta função administrativa precisa de internet. Use o site quando a conexão voltar.'},503);return this.nativeFetch(input,init)}
   return this.nativeFetch(input,init);
  }catch(e){return result({error:(e as Error).message||'Não foi possível salvar. A alteração não foi confirmada.'},409)}
 };
}
export {emptySnapshot};
