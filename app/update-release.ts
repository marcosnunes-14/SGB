// Trocar este identificador quando houver uma nova atualização a anunciar.
export const UPDATE_RELEASE='2026-10-05-circulacao-alunos';
export function claimUpdateNotice(storage:Pick<Storage,'getItem'|'setItem'>,userId:string){
 const key=`sgb:update:${userId}:${UPDATE_RELEASE}`;
 try{if(storage.getItem(key))return false;storage.setItem(key,'seen');return true}catch{return false}
}
