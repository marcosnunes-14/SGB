"use client";

import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {claimUpdateNotice} from './update-release';

export default function UpdateNotice({userId,developer=false}:{userId:string;developer?:boolean}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>{try{if(claimUpdateNotice(window.localStorage,userId))setOpen(true)}catch{/* Não repetir o aviso quando o navegador bloquear o armazenamento. */}},0);return()=>clearTimeout(timer)},[userId]);
 return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sgb-update-notice"><DialogHeader><DialogTitle>O SGB foi atualizado</DialogTitle><DialogDescription>Novidades desta atualização</DialogDescription></DialogHeader><ul><li><strong>Devolução com localização</strong><p>Ao devolver, confira a estante e a prateleira do livro antes de confirmar.</p></li><li><strong>Renovação de prazo</strong><p>Amplie a data de devolução diretamente na lista de empréstimos.</p></li>{developer&&<li><strong>Consulta de alunos por escola</strong><p>No painel de administração, abra uma escola e clique em Consultar alunos para ver os registros e o histórico.</p></li>}</ul><div className="form-footer"><Button className="primary" onClick={()=>setOpen(false)}>Entendi</Button></div></DialogContent></Dialog>;
}
