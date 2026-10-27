"use client";

import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {claimUpdateNotice} from './update-release';

export default function UpdateNotice({userId}:{userId:string;developer?:boolean}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>{try{if(claimUpdateNotice(window.localStorage,userId))setOpen(true)}catch{/* Não repetir o aviso quando o navegador bloquear o armazenamento. */}},0);return()=>clearTimeout(timer)},[userId]);
 return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sgb-update-notice"><DialogHeader><DialogTitle>O SGB foi atualizado</DialogTitle><DialogDescription>Novidades desta atualização</DialogDescription></DialogHeader><ul><li><strong>Aplicativo SGB</strong><p>No menu de funções extras, abra “Aplicativo · instalar e usar offline” para preparar este computador.</p></li><li><strong>Trabalho sem internet</strong><p>Após a preparação, consulte o acervo e registre operações no aplicativo. As alterações ficam protegidas por uma senha local e aguardam sincronização.</p></li><li><strong>Site e aplicativo juntos</strong><p>O site continua disponível. Ao voltar a conexão e entrar com o mesmo usuário e escola, sincronize as alterações pendentes.</p></li></ul><div className="form-footer"><Button className="primary" onClick={()=>setOpen(false)}>Entendi</Button></div></DialogContent></Dialog>;
}
