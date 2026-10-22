"use client";

import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {claimUpdateNotice} from './update-release';

export default function UpdateNotice({userId,developer=false}:{userId:string;developer?:boolean}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>{try{if(claimUpdateNotice(window.localStorage,userId))setOpen(true)}catch{/* Não repetir o aviso quando o navegador bloquear o armazenamento. */}},0);return()=>clearTimeout(timer)},[userId]);
 return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sgb-update-notice"><DialogHeader><DialogTitle>O SGB foi atualizado</DialogTitle><DialogDescription>Novidades desta atualização</DialogDescription></DialogHeader><ul><li><strong>Pesquisa e páginas nos empréstimos</strong><p>Consulte pendentes e entregues em páginas de 50 registros, com busca e filtros por série, prazo e período.</p></li><li><strong>Histórico e ocorrências</strong><p>Abra os detalhes para consultar renovações, registrar perda, dano, contato ou observações e emitir um comprovante.</p></li>{developer&&<li><strong>Consulta de alunos por escola</strong><p>No painel de administração, abra uma escola e clique em Consultar alunos para ver os registros e o histórico.</p></li>}</ul><div className="form-footer"><Button className="primary" onClick={()=>setOpen(false)}>Entendi</Button></div></DialogContent></Dialog>;
}
